# Editor Serialization Debounce Architecture

## Overview

`serializeEditorMarkdown()` (which invokes Turndown to convert Quill's HTML DOM to markdown) is called on every `text-change` event. In large documents with image placeholders this can take ~1.5 s. Without debounce, rapid typing queues up expensive serializations back-to-back, causing UI stutter.

The solution debounces serialization to 1 second while ensuring the latest content is always flushed before save or document switch.

## Data flow

```
user keystroke
  → Quill 'text-change' event
    → syncCenteredLayoutArtifacts(editor)        [immediate, ~3 ms]
    → onDirtyRef.current()                       [immediate, sets isDirty]
    → setTimeout(flush, 1000)                  [debounced]

flush()                                         [EditorContentLoop in editor-session-content.ts]
  → serializeEditorMarkdown(turndownRef, editor.root.innerHTML, documentId)
  → lastEditorValueRef.current = markdown       [placeholder form, lightweight]
  → hydration = hydrateMarkdownImages(markdown, documentId)
  → onChangeRef.current(hydration)              [parent gets fully-hydrated markdown]
  → return markdown                             [caller uses placeholder return value]

saveNow / selectFile / setWorkspaceActivePane
  → editorSessionRefs[pane].current?.flush() → uses return value
  → saveDocumentNow(path, latestContent, meta)  [re-hydrates for safety via useSaveDocumentNow]

revertChanges
  → ref.current.flush()                         [collapses pending debounce before discard]
  → loadDocument(path, pane)                    [disk reload path]
  → pane.reloadVersion++                        [advances explicit force-apply signal for text-identical disk reloads]
```

## Per-pane isolation

There are two independent editor instances when the workspace is in split mode, each with its own `Quill` object, its own `text-change` handler, and its own `serializationRef`. The key invariant is that **each handler captures only its own `editor` and `documentId` in the closure**. No handler ever reads `editorRef.current` or `documentIdRef.current` at fire time.

```
primaryEditor.flush()   ←→   secondaryEditor.flush()
        ↑                        ↑
serializationRefs.primary      serializationRefs.secondary
```

## Closure capture rule

The debounce timer callback is created once when `registerEditorTextChangeHandler` is called, at which point `editor`, `documentId`, and `onChange` are closed over in the callback's scope. These values never change for the lifetime of that handler, even if `documentId` prop changes and triggers a new handler registration on the same component instance.

```typescript
// Inside registerEditorTextChangeHandler — captured once at registration time:
const flush = (): string | null => {
  // editor and documentId here are the EXACT values passed at registration.
  // They are NOT read from any mutable ref at fire time.
  const markdown = serializeEditorMarkdownFromRef(turndownRef, editor.root.innerHTML, documentId)
  lastEditorValueRef.current = markdown  // placeholders for lightweight internal comparison
  const markdownForParent = hydrateMarkdownImages(markdown, documentId)  // hydrate only for parent
  onChangeRef.current(markdownForParent)
  return markdown
}
```

## Why cleanup cancels only, does not flush

The cleanup function returned by `registerEditorTextChangeHandler` only calls `clearTimeout(debounceTimer)`. It does **not** call `flush()`.

The reason: when `documentId` changes and the `useEffect` re-runs, React's cleanup runs *after* the DOM for the old Quill instance has been replaced. At that point `editor.root.innerHTML` is empty or garbage. Flushing would serialize bad content and overwrite pane state.

The caller (action) is responsible for calling `flush()` **before** initiating a document switch. This ensures the pending edits are serialized while the old editor is still alive.

## Ref mutation strategy

`serializationRef` is initialized once in `useRichEditorRefs` as:

```typescript
const serializationRef = useRef<EditorSerializationRefs>({ flush: () => null })
```

When the handler is registered, the existing object is mutated in-place:

```typescript
serializationRef.current.flush = flush  // mutation, NOT replacement
```

This matters because `workspace-editor-panels.tsx` copies the object reference into `editorSerializationRef` during the render body sync:

```typescript
// Inside RichMarkdownEditor render body — runs every render:
if (editorSerializationRef) {
  editorSerializationRef.current = serializationRef.current
}
```

If the code replaced the object (`serializationRef.current = { flush }`), the parent's reference would be stale. Mutation keeps both refs pointing to the same object, so when the effect updates `serializationRef.current.flush = realFlush`, the parent ref transparently sees the real function.

## Dirty flag is split from serialization

`text-change` triggers two independent operations:

1. **Immediate** (`onDirtyRef.current()`): sets `isDirty = true` in ~0 ms. This ensures the "save before switch" logic fires even if the user switches documents before the debounce fires.

2. **Debounced** (`flush()`): serializes and calls `onChangeRef.current()`. This is the expensive operation and is delayed by 1 s.

This split prevents the "skipped save on switch" bug where `isDirty` was still `false` when `selectFile` checked it, causing the save to be skipped entirely.

## Feedback loop prevention

`flush()` updates `lastEditorValueRef.current = markdown` (placeholder form) **before** calling `onChangeRef.current(markdownForParent)` (hydrated form). This ensures `useSyncExternalValue` compares the incoming value against the latest canonical editor value and skips re-applying equivalent content. The image hydration step ensures the parent state always receives standard markdown with embedded images, preventing cascading re-renders where placeholder-markdown corrupts the parent state.

After Slice 2 of the rich-editor refactor, the equivalence rule is explicit:

- `src/features/project-editor/components/rich-markdown-editor-value-sync.ts`
  - `normalizeEditorDocumentValue(value, documentId)`
  - `areEquivalentEditorValues(a, b, documentId)`

That module is now the only place that should know how base64 markdown images and `IMAGE_PLACEHOLDER` markdown collapse to the same in-memory editor value.

## Key interfaces

```typescript
// project-editor-types.ts
export interface EditorSession {
  flush(): string | null
}

export interface ProjectEditorModel {
  editorSessionRefs: {
    primary: { current: EditorSession | null }
    secondary: { current: EditorSession | null }
  }
}
```

```typescript
// editor-session-content.ts — Editor content loop
class EditorContentLoop {
  flush(...): string | null          // placeholder return; hydrates for onChange
  applyExternalValue(...): void      // canonical compare + forceApplyVersion
  getCanonicalValue(): string
}
// text-change handler: immediate dirty + layout sync + setTimeout(flush, 1000)
// cleanup: cancel timer only, never flush
```

## Where flush is called

Pane-targeted persistence lives in `PaneWorkspace`:

| Action | File | Target |
|--------|------|--------|
| `saveNow` | `workspace-actions.ts` | Active pane via `savePaneNow()` |
| `selectFile` | sidebar file actions | Active pane via `preparePaneExit()` |
| `setWorkspaceActivePane` | `workspace-actions.ts` | Outgoing pane via `preparePaneExit()` |
| Autosave | `pane-workspace.ts` | Active pane via internal timer |
| Close (`__tramaSaveAll`) | close effect | Both panes via `saveAllDirtyPanes()` |
| `revertChanges` | `workspace-actions.ts` | Target pane via `preparePaneRevert()` before `loadDocument()` |

## Force-apply rule for revert and disk reload

Revert can reload the exact same markdown string that the parent state already held before the user started typing. In that case a pure value-based external sync effect would skip re-applying the content, leaving dirty Quill DOM in place even though pane state is now clean.

The fix is explicit pane state, not a special-case string comparison override:

- `PaneDocumentState` carries `reloadVersion`
- `PaneWorkspace.loadPaneDocument()` increments `reloadVersion` on every disk load/revert
- `EditorPanel` forwards `reloadVersion` as `forceApplyVersion`
- `editor-session-orchestration.ts` effect calls `applyExternalValue()` when `forceApplyVersion` advances

This makes true disk reloads/removals of unsaved DOM state deterministic and independent from markdown string equality without remounting Quill, which avoids the revert flicker and scroll-jump regressions.

## Files involved

| File | Role |
|------|------|
| `editor-session/editor-session-private/editor-session-content.ts` | **Editor content loop**: debounce, flush, external apply, apply-lock |
| `editor-session/editor-session-private/editor-session-lifecycle.ts` | Quill init/dispose; delegates to content loop |
| `editor-session/editor-session-private/editor-session-orchestration.ts` | Preact effects including external-value apply |
| `rich-markdown-editor-value-sync.ts` | Shared canonical normalization/equality |
| `pane/pane-workspace.ts` | `flushPaneContent(pane)` via `editorSessionRefs` |
| `project-editor-types.ts` | `EditorSession` type, `editorSessionRefs` in model |
| `tests/editor-session.test.ts` | Content loop integration tests |

## Related docs

- `mds/plan/editor-serialization-debounce-plan.md` — Implementation plan with edge cases
- `mds/lessons-learned/editor-debounce-closure-capture.md` — Lessons from failed attempts 1 and 2
- `mds/architecture/rich-markdown-editor-core-architecture.md` — Quill lifecycle, `useSyncExternalValue`, effect dependencies
