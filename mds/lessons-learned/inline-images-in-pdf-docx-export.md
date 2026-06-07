# Inline Images in PDF and DOCX Exports

**Date**: 2026-05-10
**Component**: `book-export-line-processor.ts`, `book-export-docx-renderer.ts` (DOCX inline images). PDF now renders chapter HTML via `marked.parse()` in `book-export-renderers.ts` (ADR 0004); legacy `book-export-pdf-chapters.ts` removed.
**Status**: Fixed

## Problem

When exporting to PDF or DOCX, images that appeared inline within a line of text (e.g., `Some text ![](image.png) more text`) were silently dropped. The surrounding text would appear but the image would not render. This worked correctly in EPUB and HTML exports.

## Root Cause

The `parseLine()` function in `book-export-line-processor.ts` used `isStandaloneImageLine()` to detect images, which only matched lines that were **entirely** an image:

```typescript
function isStandaloneImageLine(line: string): boolean {
  return /^!\[([^\]]*)\]\(([^)]+)\)$/.test(trimmed)
}
```

This regex required the entire line to be just the image. Lines with text before or after the image were classified as `paragraph` and the image syntax was stripped but never processed as an actual image.

## Why EPUB and HTML Worked

EPUB and HTML renderers use `marked.parse()` which correctly handles inline images within paragraph text as standard markdown parsing.

## Solution

1. **New `paragraph-with-images` line kind** in `book-export-line-processor.ts`:
   - Added `ParagraphSegment` type: `{ type: 'text', text } | { type: 'image', imageInfo }`
   - Added `extractInlineImages()` function that splits a line into text and image segments
   - Modified `parseLine()` to detect inline images and return `paragraph-with-images` kind with segments
   - Added `onParagraphWithImages` handler to `processChapterContent`

2. **PDF renderer** (`book-export-pdf-chapters.ts`):
   - Added `onParagraphWithImages` handler that alternates between `drawParagraphLine` for text segments and `drawImage` for image segments

3. **DOCX renderer** (`book-export-docx-renderer.ts`):
   - Added `onParagraphWithImages` handler that creates paragraphs with mixed `TextRun` and `ImageRun` children

## Files Modified

- `electron/services/book-export-line-processor.ts` - New segment extraction logic
- `electron/services/book-export-pdf-chapters.ts` - New `onParagraphWithImages` handler
- `electron/services/book-export-docx-renderer.ts` - New `onParagraphWithImages` handler

## Key Lesson

When processing markdown line-by-line for formats that don't use a full markdown parser, any inline syntax (images, bold, links) that can appear mid-line needs to be parsed as mixed segments, not as a simple line classification. The pattern of `isStandaloneX()` checks that classify entire lines works only when the format is purely line-based (like standalone image blocks), but fails for inline elements within text.

This same pattern would apply to bold, italic, links, or other inline markdown within paragraphs that need to render as styled text in PDF/DOCX.