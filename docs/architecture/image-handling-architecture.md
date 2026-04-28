# Image Handling Architecture

## Purpose

This document describes how Trama handles inline base64 images in the rich markdown editor without degrading editing performance. It covers the dual-representation strategy (lightweight placeholders during editing, standard markdown images on disk), the in-memory image cache, and the full load-edit-save lifecycle.

---

## Overview

When a markdown file contains images as `data:image/...` base64 URLs, the raw HTML inside Quill can grow to 15+ MB. Running Turndown (HTML → markdown) on that HTML on every keystroke caused **25–30 second delays per character**.

The solution is to keep two representations:

| Phase | Markdown representation | Size | Purpose |
|-------|------------------------|------|---------|
| **Editing** (in-memory) | `<!-- IMAGE_PLACEHOLDER:img_0 -->` | ~30 bytes | Fast Turndown serialization |
| **Persistence** (on disk) | `![img_0](data:image/png;base64,...)` | ~1.5 MB per image | Standard markdown; any editor renders it |

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LOAD                                                                   │
│  File: ![img_0](data:image/...)                                         │
│  → marked.parse() → <img src="data:image/..."> in Quill                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  EDIT (every keystroke)                                                 │
│  Quill DOM: <img src="data:image/...">                                  │
│  → stripBase64ImagesFromHtml() replaces with                            │
│    <img src="trama-image-placeholder:img_0">                            │
│  → Turndown emits <!-- IMAGE_PLACEHOLDER:img_0 -->                      │
│  → base64 stored in imageMapCache[documentId]                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  SAVE                                                                   │
│  In-memory markdown: <!-- IMAGE_PLACEHOLDER:img_0 -->                   │
│  → hydrateMarkdownImages() expands to                                   │
│    ![img_0](data:image/png;base64,...)                                  │
│  → IPC saveDocument writes .md file                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Responsibility |
|------|----------------|
| `src/shared/markdown-image-placeholder.ts` | Image extraction, placeholder generation, hydration, in-memory cache |
| `src/features/project-editor/components/rich-markdown-editor-value-sync.ts` | Canonical editor-value normalization/equality for placeholder-vs-base64 comparisons |
| `src/features/project-editor/components/rich-markdown-editor-quill.ts` | `serializeEditorMarkdown()` (HTML → markdown with placeholders), `applyMarkdownToEditor()` (markdown → Quill with image restoration), `restoreImagesAfterMarkedparsing()` |
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | Passes `documentId` to `serializeEditorMarkdownFromRef` so the cache is populated |
| `src/features/project-editor/use-project-editor-actions.ts` | `useSaveDocumentNow` hydrates placeholders before calling IPC `saveDocument` |

---

## The Image Cache

`imageMapCache` is a module-level `Map<string, Map<string, string>>` in `markdown-image-placeholder.ts`.

- **Key**: `documentId` (the file path, used as a stable identifier)
- **Value**: `Map<uuid, dataUrl>` — the extracted base64 strings

### Why a global cache instead of React state?

1. The cache is **write-only during editing** and **read-only during save**.
2. It must survive React re-renders without triggering them.
3. It is keyed by `documentId` so multiple open documents (split pane) each have their own map.

### Cache API

```typescript
storeImageMap(documentId: string, imageMap: Map<string, string>): void
getImageMap(documentId: string): Map<string, string> | undefined
clearImageMap(documentId: string): void
```

---

## Load: Markdown → Quill

### Path

`applyMarkdownToEditor()` in `rich-markdown-editor-quill.ts`

1. `renderDirectiveArtifactsToMarkdown()` converts layout directives to HTML placeholders.
2. `marked.parse()` converts markdown → HTML.
3. `restoreImagesAfterMarkedparsing()` scans the HTML for image placeholders and restores `<img>` tags.
4. `editor.clipboard.dangerouslyPasteHTML()` inserts into Quill.
5. `syncCenteredLayoutArtifacts()` syncs CSS classes.

### Image restoration

Two formats are supported for backward compatibility:

1. **Legacy HTML comment** (old format): `<!-- IMAGE_PLACEHOLDER:uuid:dataUrl -->`
2. **Standard markdown image** (current format): `![uuid](dataUrl)` — `marked.parse` already produces `<img src="dataUrl">`

```typescript
export function restoreImagesAfterMarkedparsing(html: string): string {
  // Legacy: <!-- IMAGE_PLACEHOLDER:uuid:dataUrl -->
  const legacyRegex = /<!--\s*IMAGE_PLACEHOLDER:([^:]+):(data:image\/[^>]+)\s*-->/gi
  html = html.replace(legacyRegex, (_match, _uuid, dataUrl) => `<img src="${dataUrl}">`)

  // Standard: marked already converted ![uuid](dataUrl) to <img>
  // Nothing to do — the <img> is already in the DOM
  return html
}
```

---

## Edit: Quill → Markdown (every keystroke)

### Path

`serializeEditorMarkdown()` in `rich-markdown-editor-quill.ts`, called from the `text-change` handler.

```typescript
export function serializeEditorMarkdown(
  _turndownService: TurndownService,
  html: string,
  documentId: string,
): string {
  // 1. Strip base64 from HTML, store in cache
  const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html, documentId)

  // 2. Fresh TurndownService with custom rules
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })

  // 3. Layout directives rule
  td.addRule('trama-layout-directives', { ... })

  // 4. Image placeholder rule (only if images exist)
  if (imageMap.size > 0) {
    td.addRule('tramaImagePlaceholder', {
      filter: (node) => node.nodeName === 'IMG' &&
        node.getAttribute('src')?.startsWith('trama-image-placeholder:'),
      replacement: (_content, node) => {
        const uuid = node.getAttribute('src')!.slice('trama-image-placeholder:'.length)
        return `<!-- IMAGE_PLACEHOLDER:${uuid} -->`
      },
    })
  }

  // 5. Convert to markdown
  const markdown = normalizeMarkdown(td.turndown(htmlWithoutImages))
  return normalizeBlankLinesToSpacerDirectives(markdown)
}
```

### Why a fresh TurndownService per call?

TurndownService instances accumulate rules. Creating a fresh one per serialization avoids rule duplication and prevents test interference. The `imageMap.size > 0` guard ensures documents without images get clean Turndown output.

### Performance impact

With 9 images (~1.7 MB each, total ~15 MB base64):

| Step | Time |
|------|------|
| `stripBase64ImagesFromHtml` | ~8 ms |
| `turndown` on lightweight HTML | ~1.5 s |
| `normalizeBlankLinesToSpacerDirectives` | ~15 ms |
| **Total** | **~1.5 s** (vs. 25 s before the fix) |

The key insight: Turndown is fast on 850 KB of HTML. It is extremely slow when each `replacement` callback returns a 1.5 MB string that Turndown must then integrate into the output.

## Canonical comparison during external sync

The editor must also compare incoming values in the same placeholder-based representation used during editing. Otherwise, a base64 markdown string from disk and a placeholder markdown string from in-memory state look different even when they represent the same document.

`rich-markdown-editor-value-sync.ts` is the named boundary for that rule:

- `normalizeEditorDocumentValue(value, documentId)` converts image markdown to placeholder markdown and normalizes line endings.
- `areEquivalentEditorValues(a, b, documentId)` prevents false external re-renders by comparing canonical placeholder values only.

---

## Save: Hydration before persistence

### Path

`useSaveDocumentNow` in `use-project-editor-actions.ts`

```typescript
async (path: string, content: string, meta: DocumentMeta): Promise<void> => {
  const hydratedContent = hydrateMarkdownImages(content, path)
  const response = await window.tramaApi.saveDocument({
    path,
    content: hydratedContent,
    meta,
  })
  // ...
}
```

### Hydration

`hydrateMarkdownImages` scans the markdown for `<!-- IMAGE_PLACEHOLDER:uuid -->` comments, looks up the uuid in the cache, and replaces the comment with standard markdown image syntax:

```typescript
export function hydrateMarkdownImages(markdown: string, documentId: string): string {
  const imageMap = getImageMap(documentId)
  if (!imageMap || imageMap.size === 0) return markdown

  return markdown.replace(/<!--\s*IMAGE_PLACEHOLDER:([^\s:]+)\s*-->/gi, (_match, uuid) => {
    const dataUrl = imageMap.get(uuid)
    return dataUrl ? `![${uuid}](${dataUrl})` : _match
  })
}
```

The file on disk is standard markdown. Any markdown viewer (VS Code, Typora, GitHub) will render the image.

---

## On-Disk Format

```markdown
# Chapter Title

Some paragraph text.

![img_0](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAdcAAAFFCAYAAAC+KqeJAAAA...)

More text after the image.
```

### Why base64 inline instead of separate files?

- **Single file**: No auxiliary directory structure to manage.
- **Portable**: The .md file is self-contained; moving or emailing it preserves images.
- **Simple sync**: No need to track which image files belong to which markdown file.

The trade-off is file size (images bloat the markdown), but this is acceptable for the writing workflow. Export pipelines (book-export) can materialize data URLs to files when needed.

---

## Backward Compatibility

Documents saved with the old `<!-- IMAGE_PLACEHOLDER:uuid:dataUrl -->` comment format still load correctly. `restoreImagesAfterMarkedparsing` handles both:

1. Legacy HTML comments with embedded data URLs
2. Standard markdown image syntax produced by `marked.parse`

When such a document is edited and saved, it is rewritten in the new standard format.

---

## Testing

### Unit tests

`tests/markdown-image-placeholder.test.ts` — 18 tests covering:
- `stripBase64ImagesFromHtml`: single/multi extraction, attribute preservation, cache storage
- `imagePlaceholderToComment`: correct output format
- `extractPlaceholdersFromHtml`: uuid extraction from HTML
- `hydrateMarkdownImages`: expansion, missing cache, multiple placeholders, spacing variants
- Cache lifecycle: store, get, clear, overwrite

### Integration tests

`tests/rich-markdown-editor.test.ts` — suite `IMAGE_PLACEHOLDER round-trip regression` (5 tests):
- Paste image → placeholder in markdown
- Load standard markdown `![uuid](dataUrl)` → image visible in Quill
- Load legacy comment format → image visible in Quill (backward compatibility)
- Edit document with existing image → placeholder preserved
- Document without images → no placeholder pollution

---

## References

- Turndown docs: https://github.com/mixmark-io/turndown
- Marked docs: https://marked.js.org/
- Related architecture: `docs/architecture/rich-markdown-editor-core-architecture.md`
- Related lesson: `docs/lessons-learned/turndown-base64-replacement-performance.md`
