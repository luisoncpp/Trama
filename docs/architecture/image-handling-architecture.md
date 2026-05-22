# Image Handling Architecture

## Purpose

This document describes how Trama handles inline base64 images and broken project-local image links in the rich markdown editor without degrading editing performance. It covers the dual-representation strategy (lightweight placeholders during editing, standard markdown images on disk), the in-memory image cache, and the full load-edit-save lifecycle.

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
│  → storeImageMap() stores base64 in imageMapCache[documentId]           │
│  → createTramaTurndownService(flags) with HasImages when needed         │
│  → Turndown emits <!-- IMAGE_PLACEHOLDER:img_0 -->                      │
│  → lastEditorValueRef = placeholder-markdown (lightweight internal)     │
│  → hydrateMarkdownImages() before onChangeRef → parent gets full images │
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
| `src/shared/turndown-service-factory.ts` | Centralized `createTramaTurndownService()` — encapsulates all Turndown rules (layout directives, image placeholders, broken-image placeholders) and `normalizeMarkdownOutput()` |
| `src/features/project-editor/components/rich-markdown-editor-serialization.ts` | Debounced flush: holds `lastEditorValueRef` as placeholder-markdown, hydrates to `![...](data:...)` only before `onChangeRef.current` so parent state always receives portable markdown |
| `src/features/project-editor/components/rich-markdown-editor-value-sync.ts` | Canonical editor-value normalization/equality for placeholder-vs-base64 comparisons |
| `src/features/project-editor/components/rich-markdown-editor-quill.ts` | `serializeEditorMarkdown()` (HTML → placeholder-markdown via factory), `applyMarkdownToEditor()` (markdown → Quill with image hydration + broken-image placeholder rendering + contentEditable guard), `restoreImagesAfterMarkedparsing()` |
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | Passes `documentId` through lifecycle hooks; no longer owns debounce serialization |
| `src/features/project-editor/use-project-editor-actions.ts` | `useSaveDocumentNow` hydrates image placeholders and broken-image placeholders before calling IPC `saveDocument` |
| `electron/services/document-image-persistence.ts` | Rehydrates `res/*.png` links back to embedded PNG data; degrades missing files to editor-only broken-image placeholders instead of throwing |

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

1. `hydrateMarkdownImages(markdown, documentId)` expands any `<!-- IMAGE_PLACEHOLDER -->` comments to `![uuid](data:image/...)` if placeholders are present.
2. `renderDirectiveArtifactsToMarkdown()` converts layout directives to HTML placeholders.
3. `marked.parse()` converts markdown → HTML.
4. `restoreImagesAfterMarkedparsing()` scans the HTML for legacy image placeholders and restores `<img>` tags.
5. `editor.clipboard.dangerouslyPasteHTML()` inserts into Quill.
6. `syncCenteredLayoutArtifacts()` syncs CSS classes.

### Broken project-local images

If the repository cannot read a linked `res/*.png` file during `readDocument`, it does not throw. Instead it replaces the markdown image with an editor-only placeholder comment that preserves the original markdown payload:

```markdown
<!-- TRAMA_BROKEN_IMAGE:%7B%22alt%22%3A%22cover%22%2C%22source%22%3A%22res%2Fmissing.png%22%7D -->
```

`applyMarkdownToEditor()` converts that placeholder into a dedicated Quill embed rendered as the `🖼️` emoji. During serialization/save, the placeholder is converted back to the original markdown image syntax `![cover](res/missing.png)` so unchanged broken images round-trip without drift.

The entire operation is wrapped in `contentEditable = 'false'` to prevent user keystrokes from corrupting the DOM during `dangerouslyPasteHTML`.

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
  _turndownService: unknown,
  html: string,
  documentId: string,
): string {
  // 1. Strip base64 from HTML
  const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html)

  // 2. Store extracted images in cache for later hydration
  if (documentId && imageMap.size > 0) {
    storeImageMap(documentId, imageMap)
  }

  // 3. Create TurndownService via factory with flags
  const flags = imageMap.size > 0 ? TurndownServiceFlags.HasImages : TurndownServiceFlags.None
  const td = createTramaTurndownService(flags)

  // 4. Convert to normalized markdown
  return normalizeMarkdownOutput(td.turndown(htmlWithoutImages))
}
```

### TurndownService factory

All TurndownService instances are created via `createTramaTurndownService(flags)` in `src/shared/turndown-service-factory.ts`. This single factory encapsulates:
- Base options (`headingStyle: 'atx'`, `bulletListMarker: '-'`)
- Layout directives rule (`trama-layout-directives`, always active)
- Image placeholder rule (`tramaImagePlaceholder`, active only when `TurndownServiceFlags.HasImages` is set)
- `normalizeMarkdownOutput()` normalization (CRLF → LF, trimEnd, spacer directives)

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

`hydrateMarkdownImages` scans the markdown for `<!-- IMAGE_PLACEHOLDER:uuid -->` comments, looks up the uuid in the cache, and replaces the comment with standard markdown image syntax. `hydrateBrokenImageComments` then restores any editor-only broken-image placeholders back to their original markdown image links before save.

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

`tests/rich-markdown-editor.test.ts` — suite `IMAGE_PLACEHOLDER round-trip regression` (6 tests):
- Paste image → placeholder in markdown
- Load standard markdown `![uuid](dataUrl)` → image visible in Quill
- Load legacy comment format → image visible in Quill (backward compatibility)
- Edit document with existing image → placeholder preserved
- Load broken project-local image placeholder → `🖼️` visible in Quill and serialization preserves original markdown source
- Document without images → no placeholder pollution

`tests/folder-delete-repository.test.ts` — repository coverage for:
- rewriting embedded PNG markdown images to `res/*.png`
- hydrating `res/*.png` links back to embedded PNG markdown on read
- degrading missing `res/*.png` links to editor-only broken-image placeholders without failing document reads
- optional deletion of linked images during article delete

---

## References

- Turndown docs: https://github.com/mixmark-io/turndown
- Marked docs: https://marked.js.org/
- Related architecture: `docs/architecture/rich-markdown-editor-core-architecture.md`
- Related lesson: `docs/lessons-learned/turndown-base64-replacement-performance.md`
- Related lesson: `docs/lessons-learned/broken-project-images-need-editor-only-placeholders.md`
