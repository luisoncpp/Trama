# Debounce Plan: Editor Serialization

## Problem

`serializeEditorMarkdown()` is called **on every `text-change`** (every keystroke, paste, format change). Even after the image-placeholder optimization (~1.5 s for a 15 MB document), rapid typing still queues up expensive serializations back-to-back, causing UI stutter.

The goal is to **debounce serialization** so it only runs after the user pauses typing, while still ensuring the latest content is flushed before save or window close.

---

## What to change

### 1. `src/features/project-editor/components/rich-markdown-editor-core.ts`

**Current behavior:** `registerEditorTextChangeHandler` serializes and calls `onChange` synchronously inside the `text-change` event.

**New behavior:**
- `syncCenteredLayoutArtifacts(editor)` still runs **immediately** (it's fast, ~3 ms, and keeps CSS in sync).
- `serializeEditorMarkdownFromRef()` and `onChangeRef.current()` are wrapped in a **300 ms debounce**.
- The handler returns a **cleanup function** that clears the pending timer.
- Expose a **flush function** via a new ref so parent code can force serialization before save.

```typescript
interface EditorSerializationRefs {
  flush: () => void
}

function registerEditorTextChangeHandler({
  editor,
  documentId,
  isApplyingExternalValueRef,
  turndownRef,
  lastEditorValueRef,
  onChangeRef,
  serializationRef,
}: {
  editor: Quill
  documentId: string
  isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
  lastEditorValueRef: { current: string }
  onChangeRef: { current: (value: string) => void }
  serializationRef: { current: EditorSerializationRefs }
}): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const flush = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (isApplyingExternalValueRef.current) return
    const markdown = serializeEditorMarkdownFromRef(
      turndownRef,
      editor.root.innerHTML,
      documentId,
    )
    lastEditorValueRef.current = markdown
    onChangeRef.current(markdown)
  }

  serializationRef.current = { flush }

  editor.on('text-change', () => {
    if (isApplyingExternalValueRef.current) return
    syncCenteredLayoutArtifacts(editor)

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(flush, 300)
  })

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer)
  }
}
```

**In `useInitializeEditor`:**
- Create `const serializationRef = useRef<EditorSerializationRefs>({ flush: () => {} })`
- Pass `serializationRef` to `registerEditorTextChangeHandler`.
- Store `serializationRef` in a higher-level ref or pass it up so save logic can call `flush()`.
- The cleanup returned by `registerEditorTextChangeHandler` must be called on unmount.

### 2. `src/features/project-editor/components/rich-markdown-editor.tsx`

**Expose the flush ref** so parent hooks can access it.

If the component already uses `useImperativeHandle` or passes refs up, add `serializationRef` to that contract. If not, the simplest path is to add an `editorSerializationRef` prop of type `{ current: { flush: () => void } }` that the parent can pass in.

### 3. `src/features/project-editor/use-project-editor-actions.ts`

**Flush before save** in `useSaveDocumentNow`:

```typescript
const saveDocumentNow = useSaveDocumentNow(setters, editorSerializationRef)
```

Inside the save callback:
```typescript
async (path: string, content: string, meta: DocumentMeta): Promise<void> => {
  // Flush any pending debounced serialization so we save the latest content
  editorSerializationRef.current?.flush()

  setters.setSaving(true)
  try {
    const hydratedContent = hydrateMarkdownImages(content, path)
    // ... rest of save logic
  } finally {
    setters.setSaving(false)
  }
}
```

> **Important:** `editorSerializationRef` must be plumbed through `useProjectEditorUiActions` → `useEditorViewActions` or accessed directly from the component layer.

### 4. `src/features/project-editor/use-project-editor-close-effect.ts`

**Flush before close** so the dirty-state check and any emergency save use the latest content:

```typescript
// Before checking dirty panes or saving on close
editorSerializationRef.current?.flush()
```

### 5. `src/features/project-editor/components/workspace-editor-panels.tsx`

**Wire the ref** through the component tree:

If `RichMarkdownEditor` accepts a new `editorSerializationRef` prop, create the ref at the panel level (or higher) and pass it down:

```typescript
const editorSerializationRef = useRef<{ flush: () => void }>({ flush: () => {} })

// Pass to RichMarkdownEditor
<RichMarkdownEditor
  ...
  editorSerializationRef={editorSerializationRef}
/>

// Pass to actions that need flush
const actions = useProjectEditorUiActions({
  ...,
  editorSerializationRef,
})
```

---

## Edge cases

### User types then immediately hits Ctrl+S

Without flush, `paneState.content` would be stale (the debounce hasn't fired). The flush call in `saveDocumentNow` forces immediate serialization before the IPC call.

### Window close while typing

`useProjectEditorCloseEffect` must flush before enumerating dirty panes. Otherwise a pane might appear clean when it isn't.

### Rapid typing with paste

Pasting large content fires `text-change` once, so debounce behavior is the same as typing. The 300 ms delay is acceptable.

### Cleanup on document switch

When switching documents in split pane, the old editor unmounts. The cleanup function returned by `registerEditorTextChangeHandler` must clear the pending timer to prevent a stale `onChange` from firing after unmount.

### Autosave (every 10 minutes)

The autosave effect uses `editorValue` from state. If the user has been typing continuously for 10 minutes without pausing, the debounced `onChange` may not have fired yet. The autosave callback should also call `flush()` before reading `editorValue`.

### Dirty badge delay

With debounce, the dirty indicator (`isDirty: true`) won't update until the user pauses. This is acceptable UX — many editors (Google Docs, VS Code) behave this way. If immediate dirty feedback is required, set `isDirty` synchronously in a separate, lightweight callback while debouncing only the `content` update.

---

## Alternative: split dirty flag from content

If 300 ms of "no dirty indicator" is undesirable, an alternative is:

```typescript
editor.on('text-change', () => {
  if (isApplyingExternalValueRef.current) return
  syncCenteredLayoutArtifacts(editor)

  // Immediate: mark dirty, lightweight
  onDirtyRef.current()

  // Debounced: expensive serialization + content update
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(flush, 300)
})
```

This requires `onDirtyRef` to be plumbed similarly to `onChangeRef`, and `updateEditorValue` to be split into `markDirty()` and `updateContent()`. This adds complexity; start with the simple unified debounce and add the split only if UX testing shows the delay is problematic.

---

## Files to edit (summary)

| File | Change |
|------|--------|
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | Debounce `serializeEditorMarkdown` in `text-change` handler; expose `flush()` via ref; return cleanup function |
| `src/features/project-editor/components/rich-markdown-editor.tsx` | Accept and forward `editorSerializationRef` prop |
| `src/features/project-editor/components/workspace-editor-panels.tsx` | Create ref, pass to `RichMarkdownEditor` and actions |
| `src/features/project-editor/use-project-editor-actions.ts` | Accept `editorSerializationRef`; call `flush()` in `saveDocumentNow` |
| `src/features/project-editor/use-project-editor-ui-actions.ts` | Forward `editorSerializationRef` to `useEditorViewActions` |
| `src/features/project-editor/use-project-editor-ui-actions-helpers.ts` | Accept `editorSerializationRef` in `useEditorViewActions`; pass to `saveNow` |
| `src/features/project-editor/use-project-editor-autosave-effect.ts` | Call `flush()` before reading `editorValue` for autosave |
| `src/features/project-editor/use-project-editor-close-effect.ts` | Call `flush()` before checking dirty panes |

---

## Testing checklist

- [ ] Type 10 characters rapidly → only one `onChange` call after pause
- [ ] Type one character, wait 300 ms → `onChange` fires
- [ ] Type, then immediately Ctrl+S → save contains latest text
- [ ] Switch document while typing → no stale `onChange` from previous doc
- [ ] Close window while typing → dirty state is accurate
- [ ] Paste large image → debounce still works, no duplicate `onChange`
- [ ] Dirty badge appears after pause (or immediately if split-dirty impl is chosen)

---

## Related docs

- `docs/architecture/rich-markdown-editor-core-architecture.md` — existing core flow
- `docs/architecture/image-handling-architecture.md` — why serialization is expensive
- `docs/lessons-learned/turndown-base64-replacement-performance.md` — performance context
