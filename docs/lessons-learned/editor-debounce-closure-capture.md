# Editor Debounce: Capture in Closure, Never Read Refs Inside Timer

## What happened

Two consecutive attempts to add debounce to editor serialization failed, each worse than the last.

**Attempt 1** lost user edits when switching documents because the cleanup only cleared the timer instead of flushing pending serialization.

**Attempt 2** introduced two severe bugs:
1. **Text disappearing:** `flush()` ran during React cleanup after the old Quill instance had already been destroyed/replaced in the DOM. It serialized empty HTML and overwrote the document state.
2. **Cross-document corruption:** The timer callback read `editorRef.current` and `documentIdRef.current` at fire time. A zombie timer registered for document A fired after the user switched to document B, serialized B's DOM, and wrote it into A's pane state.

## The counter-intuitive fix

The intuitive "fix" for attempt 1 is to call `flush()` inside the effect cleanup. That is wrong because React cleanup runs *after* the DOM has already been updated for the new render. By then the old Quill editor's DOM is gone.

The intuitive way to share state with the timer is through mutable refs (`editorRef.current`, `documentIdRef.current`). That is wrong because the timer fires asynchronously; by the time it fires, those refs may already point to a different editor/document.

## Attempt 3 — what finally worked

The successful implementation added four additional rules beyond the closure-capture pattern:

4. **`flush()` returns the serialized content.** Callers (save actions, document-switch actions) must use the return value directly. They must **not** read React state (`paneState.content`, `values.editorValue`) after flushing, because React batches state updates and the state will be stale at the call site.

5. **Mutate, never replace, the serialization ref object.** `serializationRef.current` is initialized as `{ flush: () => null }` and mutated in-place (`serializationRef.current.flush = flush`). If the object were replaced (`serializationRef.current = { flush }`), the parent ref (which copied the object reference in the render body) would be stale.

6. **Expose serialization refs from the model level.** The refs must live in `ProjectEditorModel` (created in `useProjectEditor`) so that actions like `saveNow`, `selectFile`, and `setWorkspaceActivePane` can call `flush()` without prop-drilling through unrelated components.

7. **Split dirty flag from content serialization.** `text-change` triggers two independent things: (1) immediate `onDirtyRef.current()` that sets `isDirty = true`, and (2) debounced `flush()` that serializes and calls `onChange`. This prevents the "skipped save on switch" bug where `isDirty` was still `false` at switch time.

## Correct pattern

1. **Capture values in closure.** The timer callback must close over the exact `editor`, `documentId`, and `onChange` values that existed at registration time. It must never read mutable refs inside the callback.
2. **Cleanup cancels only.** The cleanup function clears the timer (`clearTimeout`). It does not flush. The caller must explicitly flush before changing the document.
3. **Prevent state → editor feedback loop.** `flush()` must update `lastEditorValueRef.current` **before** calling `onChange`, so that `useSyncExternalValue` recognizes the value as already-in-editor and does not re-apply it (which would wipe the text the user is typing).
4. **Flush returns content; callers use it directly.** Never read React state after flushing.
5. **Mutate the ref object in-place.** Never replace the object reference.

## Testing strategy

Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`. Key pitfalls:
- `updateEditorValue` bypasses the editor debounce (it updates state directly). To test the debounce, you must interact with the Quill editor directly or test through action-level `flush()` calls.
- Autosave (10 min) and editor debounce (1 s) interact: advancing 10 min is not enough; you must advance `10 min + debounce` because the autosave timer restarts when the debounce fires and updates `editorValue`.
- `loadDocument` is async and not always awaited in action code. Use multiple `await Promise.resolve()` after pane-switching actions.

## When this applies

Any debounced handler that:
- Targets a component that can be unmounted/remounted (e.g., Quill, CodeMirror).
- Writes to shared/global state that is also read back into the component via effects.
- Runs cleanup in a React effect where the underlying DOM entity is destroyed during the same cycle.
- Must be flushed by callers before document/component changes.
