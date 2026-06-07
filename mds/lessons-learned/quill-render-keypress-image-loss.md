# Quill editor image state must stay canonical

## What

When the same document can exist both as raw base64 markdown images and as short `IMAGE_PLACEHOLDER` markers, the editor can treat equivalent content as different and trigger destructive re-renders.

## Why it's counter-intuitive

The editor loads markdown from disk in standard form, for example `![img_0](data:image/...)`. During editing, serialization intentionally converts those heavy payloads into short `<!-- IMAGE_PLACEHOLDER:img_0 -->` comments backed by an in-memory image map.

If external-value sync compares the raw strings directly, it will see base64 markdown and placeholder markdown as different values even when they represent the same document. That mismatch causes Quill to re-apply the document, which can wipe in-flight typing and drop rendered images.

## The failure sequence

1. A document is loaded from disk with `![...](data:image/...)` markdown.
2. The editor renders it correctly in Quill.
3. On edit, serialization converts the DOM back into placeholder markdown for fast in-memory editing.
4. Parent state now contains placeholder markdown while another path may still provide the original base64 markdown.
5. `useSyncExternalValue` compares raw strings, decides the document changed, and calls `applyMarkdownToEditor` again.
6. Quill re-renders equivalent content unnecessarily and the user can lose text or visible images during that cycle.

## When it's likely to happen

- Right after loading a document that contains embedded images.
- Right after the first user edit, when the editor state flips from base64 markdown to placeholder markdown.
- In any flow where one path uses hydrated markdown and another uses placeholder markdown for equality checks.

## Known pattern in codebase

- `editor-debounce-closure-capture.md` (2026-04-26): debounce timer must capture `editor`/`documentId` in closure.
- `quill-text-vs-delta-index-mismatch.md` (2026-04-16): Quill text offsets don't map 1:1 to document indexes when embeds exist.
- `turndown-base64-replacement-performance.md` (2026-04-25): Turndown `replacement` callbacks and base64 performance issues.
- `quill-custom-data-attribute-loss.md` (2026-04-12): Quill drops unknown `data-*` attrs during ingestion.

## How to fix (implemented)

**Solution**: canonicalize editor markdown before comparing or storing it in editor-sync state.

- Convert `![...](data:image/...)` to `<!-- IMAGE_PLACEHOLDER:... -->` plus cached image map as soon as documents are loaded into editor state.
- Use that same canonical placeholder representation for `lastEditorValueRef` and `useSyncExternalValue` comparisons.
- Hydrate placeholders back to base64 markdown only when rendering into Quill or saving to disk.

**Code** (`rich-markdown-editor-quill.ts`):

```typescript
function normalizeEditorMarkdown(value: string, documentId: string | null): string {
  const { markdownWithoutImages } = stripBase64ImagesFromMarkdown(value, documentId ?? undefined)
  return normalizeMarkdown(markdownWithoutImages)
}
```

**Why this works**: the editor now has one stable in-memory representation for image-bearing documents. Quill is no longer asked to re-render just because one code path is using hydrated markdown and another is using placeholders.

**Why earlier attempts failed**: trying to guard Quill's render timing with temporary locks, `contentEditable` toggles, or render-phase instrumentation treated the symptom as a clipboard race. The durable fix was to remove the representation mismatch that kept provoking unnecessary re-renders.

The root cause was representational drift: the same document alternated between hydrated markdown and placeholder markdown, and the sync layer treated that as a real content difference.