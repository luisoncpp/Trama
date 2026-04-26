# Turndown replacement strings must stay small — embedding multi-megabyte base64 kills performance

Date: 2026-04-25

## Context

A document with 9 inline base64 PNG images (~1.7 MB each) caused the editor to freeze for **25–30 seconds on every keystroke**. Profiling showed the bottleneck was inside `turndownService.turndown()`, not in HTML parsing or regex replacement.

## Root Cause

Turndown processes the DOM tree and calls `replacement` callbacks for matched nodes. The callback is expected to return a string that Turndown integrates into the output markdown.

The initial fix for image handling used:

```typescript
replacement: (_content, node) => {
  const uuid = extractUuid(node)
  const dataUrl = imageMap.get(uuid)  // ~1.5 MB string
  return `<!-- IMAGE_PLACEHOLDER:${uuid}:${dataUrl} -->`  // ~1.5 MB output
}
```

Turndown internally concatenates, slices, and processes these replacement strings. When each replacement is 1.5 MB and there are 9 images, Turndown spends 25+ seconds doing string operations on 13+ MB of data — on every single `text-change` event.

## First Fix Attempt (Failed)

Replacing the base64 in HTML before Turndown with a short protocol (`trama-image-placeholder:uuid`) reduced the HTML from 16 MB to 850 KB. But the replacement callback still returned the full data URL:

```typescript
return `<!-- IMAGE_PLACEHOLDER:${uuid}:${dataUrl} -->`
```

This kept Turndown slow because the output string remained huge.

## Correct Fix

The replacement callback must return a **small fixed-size string** (~30 bytes). The base64 data is stored in a side cache keyed by `documentId`:

```typescript
// During editing: Turndown sees only this
return `<!-- IMAGE_PLACEHOLDER:${uuid} -->`  // ~30 bytes

// The data is stored separately
imageMapCache.set(documentId, new Map([[uuid, dataUrl]]))

// During save: hydrate expands the comment back to standard markdown
hydrateMarkdownImages(markdown, documentId)
// → `![uuid](data:image/png;base64,...)`
```

With this change, Turndown processes 850 KB of HTML and produces ~850 KB of markdown. The 15 MB of base64 is never inside the markdown during editing.

## Performance Comparison

| Approach | HTML size | Replacement size | Turndown time | Total per keystroke |
|----------|-----------|-----------------|---------------|---------------------|
| No stripping | 16 MB | N/A | 25+ s | 25+ s |
| Strip HTML but embed data in output | 850 KB | 1.5 MB × 9 | 25+ s | 25+ s |
| Strip HTML + short placeholder + side cache | 850 KB | 30 bytes | ~1.5 s | ~1.5 s |

## Rule

When adding custom Turndown rules that handle large inline data (base64 images, embedded fonts, data URIs):

1. **Strip the data from the DOM before Turndown runs.** Replace `<img src="data:...">` with a lightweight proxy (`<img src="protocol:uuid">`).
2. **Return a small fixed-size placeholder from the `replacement` callback.** Never return the full data string.
3. **Store the data in a side structure** (cache, map, WeakMap) keyed by a stable document identifier.
4. **Rehydrate the data only at persistence time** — after editing is done, before writing to disk.

## Regression Coverage

- `tests/markdown-image-placeholder.test.ts` — 18 unit tests for extraction, hydration, and cache behavior.
- `tests/rich-markdown-editor.test.ts` — 5 integration tests for the full load-edit-save round-trip.

## References

- Architecture doc: `docs/architecture/image-handling-architecture.md`
- Source: `src/shared/markdown-image-placeholder.ts`
