# Keep pane state editor-internal; hydrate only at the save boundary

## What is counter-intuitive

The natural instinct is to forward fully-hydrated markdown (`![uuid](data:image/…)`) from the editor's `onChange` so the parent state looks like a normal portable document. That creates a two-source problem: the editor's internal canonical value is placeholder-markdown, but the parent state is hydrated markdown. Any external-sync effect that compares the two representations sees a mismatch and may re-apply the hydrated value, destroying Quill's image DOM.

## What we learned

A single document should have **one canonical in-memory representation per process tier**:

- **Renderer pane state** is editor-internal markdown: `<!-- IMAGE_PLACEHOLDER:uuid -->` for inline images and `<!-- TRAMA_BROKEN_IMAGE:… -->` for missing `res/*.png` links. This is what `EditorContentLoop` stores, what `flush()` returns, and what `onChange` forwards to the parent.
- **Portable markdown** (`![uuid](data:image/…)`) only exists at IPC/save boundaries, produced by `DocumentContentSession.forIpcSave()`.
- **Display hydration** inside `applyMarkdownToEditor()` is a separate, read-only step: it expands placeholders so Quill can render images, but it does not change pane state.

With this invariant, `areEquivalentEditorValues()` compares two placeholder-markdown strings and external sync stays stable.

## When the old bug happened

1. `flush()` produced placeholder-markdown.
2. `onChangeRef.current()` forwarded **hydrated** markdown to the parent.
3. Parent `editorValue` became hydrated markdown.
4. `useSyncExternalValue` compared `lastEditorValueRef` (placeholder) against parent value (hydrated).
5. The comparison returned `false` and re-applied the hydrated markdown, which `applyMarkdownToEditor` then hydrated again; the mismatch caused image DOM churn or loss.

## Fix

`flush()` now forwards placeholder-markdown to `onChange` and returns placeholder-markdown. The only renderer path that calls `hydrateMarkdownImages` and `hydrateBrokenImageComments` is `DocumentContentSession.forIpcSave()`.

```ts
const flush = (): string | null => {
  const markdown = serializeEditorMarkdownFromRef(turndownRef, editor.root.innerHTML, documentId)
  lastEditorValueRef.current = markdown
  onChangeRef.current(markdown) // placeholder markdown — pane stays editor-internal
  return markdown
}
```

## Related

- `mds/lessons-learned/quill-render-keypress-image-loss.md` — canonical in-memory representation must exist
- `mds/lessons-learned/turndown-base64-replacement-performance.md` — why embedded images must stay out of the internal markdown representation
- `mds/architecture/image-handling-architecture.md` — current phase vocabulary and pane-state invariant
- `src/features/project-editor/document-content/document-content-session.ts` — the single renderer save-boundary hydration point
