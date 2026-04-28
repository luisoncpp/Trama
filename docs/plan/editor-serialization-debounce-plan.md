# Debounce Plan: Editor Serialization

## Problem

`serializeEditorMarkdown()` is called **on every `text-change`** (every keystroke, paste, format change). Even after the image-placeholder optimization (~1.5 s for a 15 MB document), rapid typing still queues up expensive serializations back-to-back, causing UI stutter.

The goal is to **debounce serialization** so it only runs after the user pauses typing, while still ensuring the latest content is flushed before save or window close.

---

## 0. CRITICAL: Antifragile design — prevent zombie timers, cross-document corruption, and state loops

> **Failure mode 1 (observed):** A timer registered for document A fires after the user switches to document B. The timer reads `editorRef.current` (now pointing to B's editor) and `documentIdRef.current` (now B's id), serializes B's DOM, and writes it into A's pane state. Result: A is overwritten with B's content.
>
> **Failure mode 2 (observed):** `flush()` runs during React cleanup after the old Quill instance has already been destroyed/replaced in the DOM. It serializes empty or partial HTML and overwrites the document state with empty text.
>
> **Failure mode 3 (observed):** The debounced `onChange` updates global pane state; `useSyncExternalValue` sees the state change and re-applies it to the editor, causing the text the user just typed to disappear (cursor jump / content wipe).
>
> **Failure mode 4 (predicted from code analysis):** The `serializationRef` is created inside `useInitializeEditor` (called within a `useEffect`). If the plan wires it to a prop `editorSerializationRef` in the render body, the prop ref will receive the **previous** editor's flush function — or a no-op stub — because the `useEffect` that updates `serializationRef.current` hasn't run yet at render time. Actions calling `editorSerializationRef.current.flush()` after a document switch will invoke a stale or no-op flush.

**Rules that must be followed:**

1. **Capture, do not read refs inside the timer.** The debounce timer callback must be a **closure** that captures `editor`, `documentId`, and `onChange` at the moment the handler is registered. It must **never** read `editorRef.current`, `documentIdRef.current`, or any mutable ref inside the timer callback or `flush`. This guarantees that even if the timer fires late, it only touches the exact editor instance and document it was created for.

2. **Cleanup cancels the timer; it does NOT flush.** Because the old Quill instance is destroyed/replaced during the same render cycle that changes `documentId`, its DOM is no longer valid by the time the `useEffect` cleanup runs. Flushing during cleanup would serialize garbage. The caller is responsible for flushing **before** changing the document.

3. **`flush()` returns the serialized content.** Callers (save actions, document-switch actions) must flush and use the returned value directly. They must **not** flush and then read React state (`paneState.content`, `values.editorValue`), because React batches state updates and the state will be stale at the call site. The flush return value is the source of truth at the moment of the save.

4. **No shared mutable refs for editor/document identity.** `lastEditorValueRef` stays local to the component instance. The debounce handler must not rely on it for deciding *which* document to write to. Document identity is captured in the closure.

5. **Prevent the state → editor feedback loop.** When `flush()` calls `onChange`, the resulting state update must not be reapplied to the editor as an "external value" while the user is still typing. `flush()` must update `lastEditorValueRef.current` **before** calling `onChange`, so that `useSyncExternalValue` sees `lastEditorValueRef.current === nextNormalized` and skips re-application.

6. **Mutate, never replace, the serialization ref object.** `serializationRef.current` is initialized as `{ flush: () => null }` in `useRichEditorRefs`. Inside `registerEditorTextChangeHandler`, **mutate** the existing object (`serializationRef.current.flush = flush`) rather than replacing it (`serializationRef.current = { flush }`). The parent's `editorSerializationRef` prop receives a copy of the object reference during the render body sync. If the object were replaced, the parent's reference would be stale. Mutation keeps them in sync transparently.

7. **Sync the parent ref in the render body, not the effect.** The line `editorSerializationRef.current = serializationRef.current` runs every render. On first render it copies the no-op stub; after the effect mutates `serializationRef.current.flush`, the parent ref sees the real function because both point to the same object. No action calls `flush()` during the render phase, so the temporary no-op is harmless.

---

## What to change

### 1. `src/features/project-editor/components/rich-markdown-editor-core.ts`

**Current behavior:** `registerEditorTextChangeHandler` serializes and calls `onChange` synchronously inside the `text-change` event.

**New behavior:**
- `syncCenteredLayoutArtifacts(editor)` still runs **immediately** (it's fast, ~3 ms, and keeps CSS in sync).
- `onDirtyRef.current()` runs **immediately** to mark the pane dirty (~0 ms).
- `serializeEditorMarkdownFromRef()` and `onChangeRef.current()` are wrapped in a **300 ms debounce**.
- The handler returns a **cleanup function** that **cancels the timer** (`clearTimeout`). It does **not** call `flush()`.
- `flush()` **returns the serialized markdown string**, so callers can use the return value directly without reading potentially-stale React state.

```typescript
interface EditorSerializationRefs {
  flush: () => string | null
}

function registerEditorTextChangeHandler({
  editor,
  documentId,
  isApplyingExternalValueRef,
  turndownRef,
  lastEditorValueRef,
  onChangeRef,
  onDirtyRef,
  serializationRef,
}: {
  editor: Quill
  documentId: string
  isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
  lastEditorValueRef: { current: string }
  onChangeRef: { current: (value: string) => void }
  onDirtyRef: { current: () => void }
  serializationRef: { current: EditorSerializationRefs }
}): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // flush is a closure over the EXACT editor and documentId captured at registration time.
  // It returns the serialized markdown so callers don't need to read stale React state.
  const flush = (): string | null => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (isApplyingExternalValueRef.current) return null
    const markdown = serializeEditorMarkdownFromRef(
      turndownRef,
      editor.root.innerHTML,
      documentId,
    )
    // Update lastEditorValueRef BEFORE calling onChange so useSyncExternalValue
    // recognizes the value as already-in-editor and does not re-apply it.
    lastEditorValueRef.current = markdown
    onChangeRef.current(markdown)
    return markdown
  }

  // Mutate the existing object so the parent ref (which copied the reference in the render body) sees the update.
  serializationRef.current.flush = flush

  editor.on('text-change', () => {
    if (isApplyingExternalValueRef.current) return
    syncCenteredLayoutArtifacts(editor)

    // Immediate: lightweight dirty flag so save/switch logic knows work is pending
    onDirtyRef.current()

    // Debounced: expensive serialization + content update
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(flush, 300)
  })

  return () => {
    // CRITICAL: cancel the timer. Do NOT flush here — the Quill instance may
    // already have been destroyed/replaced by the time this cleanup runs.
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }
}
```

**Changes to `useRichEditorLifecycle` / `useInitializeEditor`:**
- Add `serializationRef` and `onDirtyRef` to `UseRichEditorLifecycleParams`.
- Pass them to `registerEditorTextChangeHandler`.
- The cleanup returned by `registerEditorTextChangeHandler` must be captured and called inside the `useEffect` cleanup, alongside the existing cleanup logic:
```typescript
useEffect(() => {
  // ... create editor, apply value, etc.
  const cleanupHandler = registerEditorTextChangeHandler({
    editor, documentId, ...serializationRef, onDirtyRef, ...
  })
  return () => {
    cleanupHandler()   // cancels timer (no flush)
    window.removeEventListener(...)
    editorRef.current = null
  }
}, [...])
```

### 2. `src/features/project-editor/components/rich-markdown-editor.tsx`

**Accept `editorSerializationRef` and `onMarkDirty` props.**

```typescript
interface RichMarkdownEditorProps {
  // ... existing props
  /** Ref populated with the editor's flush function, for save/switch actions to call. */
  editorSerializationRef?: { current: { flush: () => string | null } }
  /** Called immediately on every keystroke to set isDirty=true on the owning pane. */
  onMarkDirty?: () => void
}
```

**Changes to `useRichEditorRefs`:**
- Accept `onMarkDirty` and create `onDirtyRef` from it:
```typescript
function useRichEditorRefs(value: string, onChange: (value: string) => void, onMarkDirty?: () => void) {
  // ... existing refs
  const onDirtyRef = useRef<() => void>(onMarkDirty ?? (() => {}))
  // Keep onDirtyRef in sync with the latest prop
  useEffect(() => { onDirtyRef.current = onMarkDirty ?? (() => {}) }, [onMarkDirty])
  // ... return
}
```
- Create `serializationRef` here and pass it to `useRichEditorLifecycle`:
```typescript
const serializationRef = useRef<{ flush: () => string | null }>({ flush: () => null })
// ... pass to useRichEditorLifecycle
```

**Wire `editorSerializationRef` prop inside the component:**
```typescript
export function RichMarkdownEditor(props: RichMarkdownEditorProps) {
  const { editorSerializationRef, onMarkDirty, ...rest } = props
  const refs = useRichEditorRefs(rest.value, rest.onChange, onMarkDirty)
  // ... useRichEditorLifecycle({ ...refs, serializationRef: refs.serializationRef, ... })

  // CRITICAL: sync the serialization ref into the parent-provided prop ref.
  // This is done inside the component body (runs on every render) because
  // serializationRef.current may be updated by the useEffect inside useInitializeEditor.
  // By the time any action calls editorSerializationRef.current.flush(),
  // the effect will have already run and assigned the real flush.
  // For safety against first-render races, the parent initializes the ref
  // with a no-op { flush: () => null }.
  if (editorSerializationRef) {
    editorSerializationRef.current = refs.serializationRef.current
  }
  // ...
}
```

> **Why this is safe despite the render-body sync:**
> - `serializationRef.current` is initialized as `{ flush: () => null }` (a no-op object).
> - In the first render, `editorSerializationRef.current` copies this no-op object reference.
> - After paint, `useEffect` runs and `registerEditorTextChangeHandler` **mutates** `serializationRef.current.flush = realFlush` (does not replace the object).
> - Because the object itself was mutated, `editorSerializationRef.current.flush` now transparently calls the real function — both refs point to the exact same object.
> - On subsequent documentId changes, the old editor's flush is replaced by a new one via mutation inside the new effect. The parent ref again sees the update transparently.

### 3. New field: `serializationRefs` on `ProjectEditorModel`

Add a `refs` field to `ProjectEditorModel` that holds the serialization refs for both panes. This allows `WorkspaceEditorPanels` to wire them into the `RichMarkdownEditor` components, and allows actions to call `flush()` without prop-drilling through unrelated components.

```typescript
// project-editor-types.ts
export interface EditorSerializationRefs {
  flush: () => string | null
}

export interface ProjectEditorModel {
  state: ProjectEditorState
  actions: ProjectEditorActions
  serializationRefs: {
    primary: { current: EditorSerializationRefs }
    secondary: { current: EditorSerializationRefs }
  }
}
```

### 4. `src/features/project-editor/use-project-editor.ts`

**Create the refs and pass them to both the model and the actions.**

```typescript
export function useProjectEditor(): ProjectEditorModel {
  // ... existing code
  const primarySerializationRef = useRef<EditorSerializationRefs>({ flush: () => null })
  const secondarySerializationRef = useRef<EditorSerializationRefs>({ flush: () => null })

  const { actions, core } = useProjectEditorActions(state, {
    primarySerializationRef,
    secondarySerializationRef,
  })

  return {
    state: buildProjectEditorModelState(values),
    actions,
    serializationRefs: {
      primary: primarySerializationRef,
      secondary: secondarySerializationRef,
    },
  }
}
```

### 5. `src/features/project-editor/use-project-editor-actions.ts`

**Accept serialization refs and pass them to action builders.**

```typescript
interface SerializationRefsForActions {
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function useProjectEditorActions(
  state: UseProjectEditorStateResult,
  refs: SerializationRefsForActions,
): UseProjectEditorActionsResult {
  // ... existing code

  // saveDocumentNow itself doesn't need the refs — it just saves what it's given.
  // The callers (saveNow, selectFile, setWorkspaceActivePane) use the refs to
  // get the latest content before calling saveDocumentNow.

  const saveDocumentNow = useSaveDocumentNow(setters)

  const actions = useProjectEditorUiActions({
    values,
    setters,
    openProject,
    loadDocument,
    saveDocumentNow,
    primarySerializationRef: refs.primarySerializationRef,
    secondarySerializationRef: refs.secondarySerializationRef,
  })

  // ...
}
```

### 6. `src/features/project-editor/use-project-editor-ui-actions-helpers.ts`

**`useEditorViewActions`: flush and use returned value in `saveNow`.**

```typescript
export function useEditorViewActions(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
  saveDocumentNow: UseProjectEditorUiActionsParams['saveDocumentNow'],
  primarySerializationRef: { current: EditorSerializationRefs },
  secondarySerializationRef: { current: EditorSerializationRefs },
) {
  return {
    updateEditorValue: (nextValue: string, pane?: WorkspacePane) => {
      // ... existing logic (unchanged)
    },
    saveNow: (pane?: WorkspacePane) => {
      const targetPane = pane ?? values.workspaceLayout.activePane
      const paneState = targetPane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (!paneState.path || values.saving || !paneState.isDirty) {
        return
      }
      // Flush and use the returned content directly — do NOT read paneState.content
      // because React state updates are batched and the content is stale at this point.
      const ref = targetPane === 'secondary' ? secondarySerializationRef : primarySerializationRef
      const latestContent = ref.current.flush() ?? paneState.content
      void saveDocumentNow(paneState.path, latestContent, paneState.meta)
    },
    // ... rest unchanged
  }
}
```

**`useSelectFileAction`: flush before switching to a new file.**

```typescript
export function useSelectFileAction({
  values,
  loadDocument,
  assignFileToActivePane,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: {
  // ... existing params
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}): ProjectEditorActions['selectFile'] {
  return useCallback(
    async (filePath: string): Promise<void> => {
      // Flush pending edits for the active pane so dirty-check sees latest content
      const activePane = values.workspaceLayout.activePane
      const ref = activePane === 'secondary' ? secondarySerializationRef : primarySerializationRef
      const flushedContent = ref.current.flush()

      const activePaneState = activePane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (activePaneState.isDirty && activePaneState.path) {
        const contentToSave = flushedContent ?? activePaneState.content
        await saveDocumentNow(activePaneState.path, contentToSave, activePaneState.meta)
      }

      assignFileToActivePane(filePath)
      if (filePath !== activePaneState.path) {
        void loadDocument(filePath, activePane)
      }
    },
    [/* ... existing deps */, primarySerializationRef, secondarySerializationRef],
  )
}
```

**`useSetWorkspaceActivePaneAction`: flush the outgoing pane before switching.**

```typescript
export function useSetWorkspaceActivePaneAction({
  values,
  setters,
  loadDocument,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: UseSetWorkspaceActivePaneActionParams & {
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}): ProjectEditorActions['setWorkspaceActivePane'] {
  return useCallback(
    async (pane: WorkspacePane) => {
      const outgoingPane = values.workspaceLayout.activePane
      const outgoingState = outgoingPane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (outgoingState.isDirty && outgoingState.path) {
        // Flush the outgoing pane before saving
        const ref = outgoingPane === 'secondary' ? secondarySerializationRef : primarySerializationRef
        const latestContent = ref.current.flush() ?? outgoingState.content
        await saveDocumentNow(outgoingState.path, latestContent, outgoingState.meta)
      }

      // ... rest of pane switching logic (unchanged)
    },
    [/* ... existing deps */, primarySerializationRef, secondarySerializationRef],
  )
}
```

**Propagate refs through all intermediate action builders.** Update the signatures of `usePrimaryProjectEditorActions`, `useEditorViewActions`, `useSelectFileAction`, `useWorkspaceLayoutActions`, and `UseProjectEditorUiActionsParams` to accept and forward the two serialization refs.

### 7. `src/features/project-editor/use-project-editor-autosave-effect.ts`

**Flush before reading `editorValue` for autosave.**

Accept the two serialization refs and use them:

```typescript
interface UseProjectEditorAutosaveEffectParams {
  selectedPath: string | null
  isDirty: boolean
  editorValue: string
  editorMeta: DocumentMeta
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  activePane: WorkspacePane
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function useProjectEditorAutosaveEffect({
  selectedPath,
  isDirty,
  editorValue,
  editorMeta,
  saveDocumentNow,
  activePane,
  primarySerializationRef,
  secondarySerializationRef,
}: UseProjectEditorAutosaveEffectParams): void {
  useEffect(() => {
    if (!selectedPath || !isDirty) return

    const timer = window.setTimeout(() => {
      const ref = activePane === 'secondary' ? secondarySerializationRef : primarySerializationRef
      const latestContent = ref.current.flush() ?? editorValue
      void saveDocumentNow(selectedPath, latestContent, editorMeta)
    }, 10 * 60 * 1000)

    return () => { window.clearTimeout(timer) }
  }, [editorMeta, editorValue, isDirty, saveDocumentNow, selectedPath, activePane, primarySerializationRef, secondarySerializationRef])
}
```

### 8. `src/features/project-editor/use-project-editor-close-effect.ts`

**Flush both panes before saving on close.**

```typescript
interface UseProjectEditorCloseEffectParams {
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function useProjectEditorCloseEffect({
  primaryPane,
  secondaryPane,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: UseProjectEditorCloseEffectParams): void {
  // ... existing unsaved changes check

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__tramaSaveAll = async (): Promise<void> => {
      const dirtyPanes: Array<{ path: string; content: string; meta: DocumentMeta }> = []

      if (primaryPane.isDirty && primaryPane.path) {
        const flushed = primarySerializationRef.current.flush() ?? primaryPane.content
        dirtyPanes.push({ path: primaryPane.path, content: flushed, meta: primaryPane.meta })
      }

      if (secondaryPane.isDirty && secondaryPane.path) {
        const flushed = secondarySerializationRef.current.flush() ?? secondaryPane.content
        dirtyPanes.push({ path: secondaryPane.path, content: flushed, meta: secondaryPane.meta })
      }

      await Promise.all(dirtyPanes.map((p) => saveDocumentNow(p.path, p.content, p.meta)))
    }
    return () => { delete w.__tramaSaveAll }
  }, [primaryPane, secondaryPane, saveDocumentNow, primarySerializationRef, secondarySerializationRef])
}
```

### 9. `src/features/project-editor/components/workspace-editor-panels.tsx`

**Pass per-pane serialization refs and `onMarkDirty` to `RichMarkdownEditor`.**

```typescript
interface LayoutControlsProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
}

interface PaneEditorProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
  pane: 'primary' | 'secondary'
  tagIndex: Record<string, string> | null
  onTagClick: (filePath: string) => void
}

function PaneEditor({ model, spellcheckEnabled, pane, tagIndex, onTagClick }: PaneEditorProps) {
  const { state, actions, serializationRefs } = model
  const paneState = pane === 'secondary' ? state.secondaryPane : state.primaryPane
  const isActive = state.workspaceLayout.activePane === pane

  const serializationRef = pane === 'primary'
    ? serializationRefs.primary
    : serializationRefs.secondary

  const onMarkDirty = () => {
    // Mark this pane dirty immediately. Use the current content so only isDirty flips.
    actions.updateEditorValue(paneState.content, pane)
  }

  const onPaneEditorChange = (nextValue: string) => {
    actions.updateEditorValue(nextValue, pane)
  }

  // ... rest unchanged

  return (
    <section ...>
      <header ...>...</header>
      <div class="workspace-split-pane__body">
        <EditorPanel
          selectedPath={paneState.path}
          saving={state.saving && isActive}
          isDirty={paneState.isDirty}
          loadingDocument={state.loadingDocument && isActive}
          editorValue={paneState.content}
          spellcheckEnabled={spellcheckEnabled}
          onSaveNow={onPaneSaveNow}
          onEditorChange={onPaneEditorChange}
          focusModeEnabled={state.workspaceLayout.focusModeEnabled}
          focusScope={state.workspaceLayout.focusScope}
          onInteract={onActivate}
          tagIndex={tagIndex}
          onTagClick={onTagClick}
          isActive={isActive}
          // NEW: serialization and dirty-mark props
          editorSerializationRef={serializationRef}
          onMarkDirty={onMarkDirty}
        />
      </div>
    </section>
  )
}
```

`ActiveEditorPanel` (used in single-pane mode) follows the same pattern: pass `serializationRefs.primary` and an `onMarkDirty` that calls `actions.updateEditorValue(state.editorValue)`.

`EditorPanel` forwards these to `RichMarkdownEditor`:
```typescript
interface EditorPanelProps {
  // ... existing props
  editorSerializationRef?: { current: { flush: () => string | null } }
  onMarkDirty?: () => void
}

export function EditorPanel({ ... , editorSerializationRef, onMarkDirty, }: EditorPanelProps) {
  return (
    <article ...>
      <div ...>
        <RichMarkdownEditor
          // ... existing props
          editorSerializationRef={editorSerializationRef}
          onMarkDirty={onMarkDirty}
        />
      </div>
    </article>
  )
}
```

### 10. `src/features/project-editor/use-project-editor-layout-actions.ts`

**`useOpenFileInPaneAction`: flush the outgoing pane when `openFileInPane` would overwrite the primary pane.**

When `pane === 'primary'` and `canSelectFile` would return false (document is dirty), `openFileInPane` currently only shows an error message. If the caller wants to auto-save, they should flush first. The minimal change: accept serialization refs and save the dirty content before switching (same pattern as `selectFile`).

```typescript
// Inside useOpenFileInPaneAction, pane === 'primary' branch:
if (!canSelectFile(values.isDirty, values.selectedPath, filePath)) {
  // Auto-save dirty primary pane before opening the new file
  if (values.primaryPane.path) {
    const flushed = primarySerializationRef.current.flush() ?? values.primaryPane.content
    await saveDocumentNow(values.primaryPane.path, flushed, values.primaryPane.meta)
  }
  // else proceed (dirty but no path = edge case, skip)
}
```

> Update `UseWorkspaceLayoutActionParams` and `UseSetWorkspaceActivePaneActionParams` to include `primarySerializationRef` and `secondarySerializationRef`.

---

## Edge cases

### User types then immediately hits Ctrl+S

Without flush, `paneState.content` would be stale (the debounce hasn't fired). `saveNow` calls `flush()` and uses the returned value directly, bypassing stale state.

### Window close while typing

`useProjectEditorCloseEffect` flushes **both** panes before enumerating dirty panes. Each pane's latest content comes from `flush()` return value, not from `paneState.content`.

### Rapid typing with paste

Pasting large content fires `text-change` once, so debounce behavior is the same as typing. The 300 ms delay is acceptable.

### Switching documents before debounce fires (CRITICAL — data loss & corruption)

> **Lesson learned (attempt 1):** If the user types in document A and switches to document B before the 300 ms debounce elapses, the pending serialization for A is lost.
>
> **Lesson learned (attempt 2 — worse):** An agent tried to fix attempt 1 by calling `flush()` inside React cleanup. The old Quill instance had already been destroyed/replaced in the DOM; `flush()` serialized empty HTML and overwrote document A. The agent also read `editorRef.current` inside the timer callback; zombie timers for A serialized B's DOM into A's state.
>
> **Correct design:**
> 1. The caller must **flush before changing the document**, not rely on cleanup. `selectFile`, `setWorkspaceActivePane`, and `openFileInPane` all call `flush()` on the relevant pane before proceeding.
> 2. The timer callback is a **closure** over the exact `editor` and `documentId` captured at registration time. It never reads mutable refs.
> 3. The cleanup function **only cancels the timer** (`clearTimeout`). It does not call `flush()`.
> 4. `flush()` returns the serialized markdown. Callers use the return value directly.

### Switching documents before dirty flag updates (CRITICAL — skipped save)

> If dirty state is only updated inside the debounced callback, `isDirty` is still `false` when the switch action checks it. The save is skipped.
>
> **Correct fix:** Decouple dirty-flagging from content serialization.
> - `text-change` triggers **two** independent things:
>   1. **Immediate:** `onDirtyRef.current()` → `onMarkDirty()` → `actions.updateEditorValue(currentContent, pane)` which sets `isDirty = true`.
>   2. **Debounced:** `flush()` that serializes and calls `onChangeRef.current()`.
> - The "save before switch" logic now sees `isDirty === true` and proceeds with the save.

### Text disappears after typing (editor-state feedback loop)

> When the debounce calls `onChange`, the value propagates to pane state. `useSyncExternalValue` sees the state change and re-applies it to the editor. If `lastEditorValueRef` hasn't been updated, the freshly-serialized value looks "external" and gets injected, wiping the text being typed.
>
> **Fix:** `flush()` updates `lastEditorValueRef.current = markdown` **before** calling `onChangeRef.current(markdown)`. `useSyncExternalValue` then sees the values match and skips re-application.

### Autosave fires while user is mid-typing

The autosave callback calls `flush()`, which cancels any pending debounce timer and serializes immediately. This is correct: the autosave needs the latest content. A new debounce cycle will start on the next keystroke.

### Ref sync timing on first render

On first render, `RichMarkdownEditor` assigns `editorSerializationRef.current = serializationRef.current` where `serializationRef.current` is still the no-op `{ flush: () => null }`. Only after the `useEffect` in `useInitializeEditor` runs does it become the real `flush`. This is safe because no action calls `flush()` between mount and first effect execution (the app hasn't rendered an interactive editor yet).

---

## All code paths that must flush before changing a pane's document

| Action | File | Must flush |
|--------|------|-----------|
| `selectFile` | `use-project-editor-ui-actions-helpers.ts:46-70` | Active pane before switching |
| `setWorkspaceActivePane` | `use-project-editor-layout-actions.ts:86-118` | Outgoing pane before saving |
| `openFileInPane` (primary) | `use-project-editor-layout-actions.ts:142-157` | Primary pane before switching |
| `saveNow` | `use-project-editor-ui-actions-helpers.ts:175-182` | Target pane before saving |
| Autosave effect | `use-project-editor-autosave-effect.ts:19-31` | Active pane before saving |
| Close effect (`__tramaSaveAll`) | `use-project-editor-close-effect.ts:26-38` | Both panes before saving |

---

## Files to edit (summary)

| File | Change |
|------|--------|
| `project-editor-types.ts` | Add `EditorSerializationRefs` type, add `serializationRefs` to `ProjectEditorModel` |
| `rich-markdown-editor-core.ts` | Debounce `serializeEditorMarkdown` in `text-change` handler; add `onDirtyRef` and `serializationRef` params; return cleanup that cancels timer only; `flush` returns content |
| `rich-markdown-editor.tsx` | Accept `editorSerializationRef` and `onMarkDirty` props; create `serializationRef` and `onDirtyRef` in `useRichEditorRefs`; wire them to the hook and props |
| `editor-panel.tsx` | Forward `editorSerializationRef` and `onMarkDirty` to `RichMarkdownEditor` |
| `workspace-editor-panels.tsx` | Read `serializationRefs` from model; pass per-pane ref and `onMarkDirty` to `EditorPanel`/`ActiveEditorPanel` |
| `use-project-editor.ts` | Create `primarySerializationRef` and `secondarySerializationRef`; pass to actions and expose via model |
| `use-project-editor-actions.ts` | Accept and forward `SerializationRefsForActions` |
| `use-project-editor-ui-actions.ts` | Forward refs to `usePrimaryProjectEditorActions` |
| `use-project-editor-ui-actions-helpers.ts` | Accept refs in `useEditorViewActions`, `useSelectFileAction`, `useWorkspaceLayoutActions`; flush and use return value |
| `use-project-editor-layout-actions.ts` | Accept refs in layout actions; flush before save in `setWorkspaceActivePane` and `openFileInPane` |
| `use-project-editor-autosave-effect.ts` | Accept refs; flush before autosave |
| `use-project-editor-close-effect.ts` | Accept refs; flush both panes before close save |

---

## Testing checklist

- [x] Type 10 characters rapidly → only one `onChange` call after pause
- [x] Type one character, wait 1000 ms → `onChange` fires
- [x] Type, then immediately Ctrl+S → save contains latest text
- [x] Switch document while typing → latest text is NOT lost (caller flushes before switch; cleanup does NOT flush)
- [x] Type in doc A, switch to doc B before debounce fires → doc A is saved because dirty was set immediately; doc B does NOT contain A's content
- [x] Switch rapidly between two documents multiple times → no cross-document contamination in pane state
- [x] Type continuously for 5 seconds → text never disappears or cursor never jumps back (no feedback loop)
- [x] Close window while typing → dirty state is accurate, `__tramaSaveAll` saves latest content
- [x] Autosave (10 min) fires while user is mid-sentence → latest content is saved, not stale state
- [x] Paste large image → debounce still works, no duplicate `onChange`
- [x] Dirty badge appears immediately on first keystroke (not after debounce)

## Regression tests

File: `tests/project-editor-debounce-regression.test.ts`

Covers:
1. `saveNow` forces immediate flush and uses the returned value, not stale React state.
2. `selectFile` flushes the active pane before switching to a new file.
3. `setWorkspaceActivePane` flushes and saves the outgoing pane before activating the target pane.
4. Rapid pane switching (5+ switches) does not cause cross-document contamination.
5. Dirty flag (`isDirty`) is set immediately on `updateEditorValue`, before the debounce fires.
6. Autosave (10 min) fires and uses the flushed content, not stale state.
7. Editor content is not wiped when the debounced `onChange` updates pane state (feedback loop prevention).
8. `flush` returns `null` when `isApplyingExternalValueRef` is true (external sync protection).

All 9 tests pass. Run with:
```bash
npx vitest run tests/project-editor-debounce-regression.test.ts
```

---

## Related docs

- `docs/architecture/rich-markdown-editor-core-architecture.md` — existing core flow
- `docs/architecture/image-handling-architecture.md` — why serialization is expensive
- `docs/architecture/editor-serialization-debounce-architecture.md` — full data flow, ref mutation strategy, per-pane isolation, flush callers table
- `docs/lessons-learned/turndown-base64-replacement-performance.md` — performance context
- `docs/lessons-learned/editor-debounce-closure-capture.md` — why closures beat refs in debounce timers
