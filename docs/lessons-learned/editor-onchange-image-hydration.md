# Parent-state image hydration in editor debounce

## What is counter-intuitive

The editor debounce serializes HTML to lightweight placeholder-markdown (`<!-- IMAGE_PLACEHOLDER:uuid -->`) for internal tracking. However, if this same placeholder-markdown reaches the parent React state via `onChange`, the next `useSyncExternalValue` effect may trigger a destructive re-render that loses all embedded images from the Quill DOM.

## When it happens

1. The debounced `flush()` serializes `editor.root.innerHTML` → produces placeholder-markdown
2. `lastEditorValueRef.current` is set to placeholder-markdown (correct, lightweight internal state)
3. `onChangeRef.current(placeholder_markdown)` forwards placeholder-markdown to parent
4. Parent sets its `editorValue` state to placeholder-markdown
5. `useSyncExternalValue` fires: `areEquivalentEditorValues(lastEditorValueRef, value, documentId)` may return `false` because the parent's `value` (placeholders) differs from what `lastEditorValueRef` expects
6. `applyMarkdownToEditor` is called with placeholder-markdown → no embedded images survive in Quill

## Why it's hard to catch

The cascade only triggers when the parent's state and the editor's internal state diverge. This happens most often during document load (effects fire before debounce completes), after rapid typing, or when React StrictMode causes double effect execution.

## Fix

In `flush()`, hydrate placeholders to `![uuid](data:image/...)` only when calling `onChangeRef`. Keep `lastEditorValueRef` as placeholder-markdown for lightweight internal comparison.

```ts
const flush = (): string | null => {
  // ... debounce clear, guard check ...
  const markdown = serializeEditorMarkdownFromRef(turndownRef, editor.root.innerHTML, documentId)
  lastEditorValueRef.current = markdown  // placeholders for internal comparison
  const markdownForParent = hydrateMarkdownImages(markdown, documentId)  // embedded images for parent
  onChangeRef.current(markdownForParent)
  return markdown
}
```

## Related

- `docs/lessons-learned/quill-render-keypress-image-loss.md` — canonical in-memory representation must exist
- `docs/lessons-learned/turndown-base64-replacement-performance.md` — why embedded images must stay out of the internal markdown representation
- `src/features/project-editor/components/rich-markdown-editor-serialization.ts` — where the fix lives