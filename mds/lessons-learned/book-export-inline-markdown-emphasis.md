# Book Export Inline Emphasis (Bold / Italic)

**Date**: 2026-06-01
**Component**: `book-export-inline-markdown.ts`, `book-export-docx-renderer.ts` (DOCX); PDF uses `marked.parse()` via `book-export-renderers.ts` / segment HTML (see ADR 0004)
**Status**: Fixed

## Problem

PDF and DOCX exports showed raw markdown emphasis markers instead of styled text:

- `_The Weight of Three_` appeared with literal underscores (underscore emphasis with spaces).
- `## *Styled Title*` headings showed literal asterisks in PDF.

HTML and EPUB already used `marked.parse()` on full chapter content, so emphasis there was generally correct.

## Root Cause

PDF and DOCX use `book-export-line-processor.ts`, which passes heading and paragraph text through custom logic:

- PDF `inlineTokens()` used regex `_([^_]+)_`, which only matches emphasis **without spaces**, so multi-word `_like this_` kept underscores.
- PDF headings called `drawHeading()` with raw markdown text (no inline parsing).
- DOCX `stripInlineMarkdown()` only stripped `*...*` / `**...**`, not `_..._` or `__...__`, and did not apply bold/italic to `TextRun`s.

## Solution

1. Added `book-export-inline-markdown.ts` using `marked.lexer()` to produce `{ text, bold, italic }` runs (same rules as standard markdown, including `_multi word_` and `**strong**`).
2. PDF: `inlineTokens()` delegates to that parser; headings use the same runs; italic uses embedded system italic fonts when available.
3. DOCX: paragraphs and headings build `TextRun` children from parsed runs instead of stripping markers to plain text.

## Regression tests

- `tests/book-export-inline-markdown.test.ts`
- `tests/book-export-pdf-inline.test.ts` (italic cases)
- `tests/book-export-renderers.test.ts` (HTML, DOCX, EPUB inline emphasis)

## Key lesson

When one export path uses a full markdown parser (`marked`) and another uses line-by-line processing, **all inline syntax** (emphasis, links, images) must share one parser or the formats drift. Reuse `marked` (or a shared wrapper) for inline runs in PDF/DOCX instead of hand-rolled regex.
