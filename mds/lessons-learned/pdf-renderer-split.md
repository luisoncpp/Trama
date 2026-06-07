# PDF renderer refactor: split barrel file

> **Superseded (2026-06-04):** Legacy pdf-lib layout (`book-export-pdf-utils.ts`, `book-export-pdf-chapters.ts`, font helpers) was removed. PDF export now uses HTML segments + `printToPDF` — see `mds/lessons-learned/book-export-pdf-print-surface.md` and ADR 0004. This entry is kept for the file-splitting pattern only.

**Date**: 2026-04-17

**Problem**: `book-export-pdf-renderer.ts` exceeded `max-lines: 200` (had 202 lines) causing lint errors.

**Solution**: Split into three files following single-responsibility principle:

- `book-export-pdf-font-utils.ts` — font normalization utilities (`normalizeForFont`, `safeTextForFont`, `normalizeRunsForFonts`). Re-exported for potential reuse.
- `book-export-pdf-utils.ts` — core PDF writer implementation (`createPdfWriter`, `PdfWriter` interface, `PdfLayoutState`, and all drawing functions: `drawRuns`, `drawHeading`, `drawPdfImage`, `drawWrappedParagraph`).
- `book-export-pdf-renderer.ts` — thin re-export barrel (3 lines) that re-exports types and functions from `book-export-pdf-utils.ts`.

**Why this structure**: The font utilities are logically distinct from the PDF writing orchestration. The barrel lets existing importers (`book-export-service.ts`, `book-export-pdf-chapters.ts`) keep their import paths unchanged while the implementation lives in the split files.

**Update order when splitting a file**:
1. Create new files with extracted code
2. Update barrel to re-export from new files
3. Update all importers to use barrel path (not internal files)
4. Update `mds/live/file-map.md` with new file entries
5. Update `mds/REFACTORIZAR.md` to mark as resolved
6. Add lesson to `mds/lessons-learned/`
7. Run lint to confirm no regressions