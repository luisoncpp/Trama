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

flush()
  → serializeEditorMarkdown(turndownRef, editor.root.innerHTML, documentId)
  → lastEditorValueRef.current = markdown       [prevents feedback loop]
  → onChangeRef.current(markdown)               [debounced onChange → pane state]
  → return markdown                             [caller uses return value directly]

saveNow / selectFile / setWorkspaceActivePane
  → ref.current.flush() → uses return value     [bypasses stale React state]
  → saveDocumentNow(path, latestContent, meta)
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
  lastEditorValueRef.current = markdown
  onChangeRef.current(markdown)
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

`flush()` updates `lastEditorValueRef.current = markdown` **before** calling `onChangeRef.current(markdown)`. This ensures `useSyncExternalValue` sees `lastEditorValueRef.current === nextNormalized` and skips re-applying the value to the editor. Without this, the freshly-serialized value would look like an "external" change and get re-applied, wiping the text the user just typed.

## Key interfaces

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

```typescript
// rich-markdown-editor-core.ts
interface EditorTextChangeHandlerParams {
  editor: Quill
  documentId: string
  isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
  lastEditorValueRef: { current: string }
  onChangeRef: { current: (value: string) => void }
  onDirtyRef: { current: () => void }
  serializationRef: { current: EditorSerializationRefs }
}
// Returns cleanup: () => void (only clears timer, no flush)
```

## Where flush is called

| Action | File | Target |
|--------|------|--------|
| `saveNow` | `use-project-editor-ui-actions-helpers.ts:editorViewActions` | Active pane's `flush()` |
| `selectFile` | `use-project-editor-ui-actions-helpers.ts:selectFileAction` | Active pane's `flush()` |
| `setWorkspaceActivePane` | `use-project-editor-layout-actions.ts` | Outgoing pane's `flush()` |
| Autosave effect | `use-project-editor-autosave-effect.ts` | Active pane's `flush()` |
| Close effect (`__tramaSaveAll`) | `use-project-editor-close-effect.ts` | Both panes' `flush()` |

## Files involved

| File | Role |
|------|------|
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | Handler registration, debounce logic, `flush()` closure |
| `src/features/project-editor/components/rich-markdown-editor.tsx` | Props `editorSerializationRef` + `onMarkDirty`, ref mutation sync |
| `src/features/project-editor/components/editor-panel.tsx` | Passes props through |
| `src/features/project-editor/components/workspace-editor-panels.tsx` | Reads `serializationRefs` from model, routes per pane |
| `src/features/project-editor/project-editor-types.ts` | `EditorSerializationRefs` type, `serializationRefs` in model |
| `src/features/project-editor/use-project-editor.ts` | Creates refs, wires into actions and effects |
| `src/features/project-editor/use-project-editor-actions.ts` | Accepts and forwards `SerializationRefsForActions` |
| `src/features/project-editor/use-project-editor-ui-actions.ts` | Passes refs to `usePrimaryProjectEditorActions` |
| `src/features/project-editor/use-project-editor-ui-actions-helpers.ts` | `saveNow`, `selectFile`, `editorViewActions` |
| `src/features/project-editor/use-project-editor-layout-actions.ts` | `setWorkspaceActivePane`, `openFileInPane` |
| `src/features/project-editor/use-project-editor-autosave-effect.ts` | Flush before autosave |
| `src/features/project-editor/use-project-editor-close-effect.ts` | Flush both panes on window close |

## Related docs

- `docs/plan/editor-serialization-debounce-plan.md` — Implementation plan with edge cases
- `docs/lessons-learned/editor-debounce-closure-capture.md` — Lessons from failed attempts 1 and 2
- `docs/architecture/rich-markdown-editor-core-architecture.md` — Quill lifecycle, `useSyncExternalValue`, effect dependencies