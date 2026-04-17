# Quill getText() offsets can drift from document indexes when embeds exist

Date: 2026-04-16

## Context

Wiki-tag underlines started a few characters before the expected word, and in some lines the underline stretched far past the tag text.

## Root Cause

Tag matching used `editor.getText()` and regular expressions to compute `{ start, end }` offsets, then passed those offsets directly into `quill.getBounds(start, length)`.

That assumption fails when the document contains Quill embeds (for example directive/pagebreak blots):

- `getText()` omits embed content from plain text.
- Quill document indexes still count each embed as length `1`.

So after one or more embeds, plain-text offsets are smaller than Quill indexes. This produces underlines shifted to the left and oversized hit/underline ranges.

## Fix

Before calling `getBounds`, convert plain-text offsets to Quill document indexes by walking `editor.getContents().ops`:

- Add string op lengths to both plain-text and Quill counters.
- Add `1` to Quill counter for each embed op.
- Map both match start and end using this conversion.

Then call:

```ts
const quillStart = mapPlainTextIndexToQuillIndex(editor, match.start)
const quillEnd = mapPlainTextIndexToQuillIndex(editor, match.end)
const bounds = editor.getBounds(quillStart, quillEnd - quillStart)
```

## Rule

Never pass raw offsets derived from `getText()` into Quill APIs that expect document indexes (`getBounds`, `setSelection`, etc.) without accounting for embed ops.

## Regression Coverage

Added `tests/rich-markdown-editor-tag-overlay.test.ts` to verify mapping when an embed appears before matching tags.
