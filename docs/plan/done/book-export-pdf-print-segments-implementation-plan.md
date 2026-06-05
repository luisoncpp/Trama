# Book export PDF — HTML segments + printToPDF

**Date:** 2026-06-04  
**Status:** Complete (moved to `docs/plan/done/` after implementation)  
**ADR:** [0004-book-pdf-via-html-print-segments.md](../../adr/0004-book-pdf-via-html-print-segments.md)  
**Architecture:** [book-export-architecture.md](../../architecture/book-export-architecture.md) (section Export PDF)  
**Domain terms:** `CONTEXT.md` (Book export)

## 1. Objective

Replace the slow manual `pdf-lib` layout path with:

1. Build ordered **PDF export segments** (markdown between **Author page break** directives only).
2. Render each segment to HTML (segment 0 = full book shell + metadata; later segments = body-only + same print CSS).
3. `webContents.printToPDF` per segment via a hidden **Book export print surface** (singleton, injectable in tests).
4. **PDF segment merge** — linear in-memory `pdf-lib` `copyPages` only (no layout).

**Non-goals:** per-segment parallelism, UI progress, pixel-perfect match to legacy PDF, Puppeteer/external PDF CLI.

**Success:** Exporting a large book feels clearly faster than today; existing functional PDF regression cases still pass (with updated assertions where needed).

## 2. Decisions (do not re-litigate)

| Topic | Decision |
|--------|----------|
| Segment boundaries | Author page break lines only (`parseDirectiveLine` pagebreak kinds) |
| Why segments | PDF page seams at concat, not CSS `page-break-after` on one HTML doc |
| Manuscript assembly | Corkboard-ordered `BookExportChapter[]` + **inter-document gap** (two blank lines) when prior file did not end on pagebreak |
| HTML shell | Full on segment 0; body-only on segment 1+ |
| Engine | Electron `printToPDF` |
| Legacy pdf-lib layout | Remove entirely after migration |
| Merge | One `PDFDocument`, load each segment PDF once, `copyPages`; never save/reload accumulator between segments |
| Typography | Functional parity; `"Times New Roman", Times, serif` in print CSS |
| HTML load | Temp file per segment (`loadFile` + `did-finish-load`) |
| Print surface | Process singleton + mutex/queue; `setBookExportPrintSurfaceForTests` |
| UX | Silent; `console.warn` / `console.error` on failures |
| Metadata | Pass `BookExportMetadata` into `renderPdfBook` (segment 0 header); wire from `book-export-service.ts` |

**Follow-up (separate slice, can be parallel):** Fix HTML export **inter-document gap** bug per same standard (`renderHtmlBook`).

## 3. Prerequisites (read before coding)

1. `docs/START-HERE.md`
2. `docs/architecture/book-export-architecture.md`
3. `docs/adr/0004-book-pdf-via-html-print-segments.md`
4. `CONTEXT.md` (Book export section)
5. Skim legacy: `electron/services/book-export-pdf-utils.ts`, `book-export-pdf-chapters.ts`, `book-export-directives.ts`, `book-export-renderers.ts`

## 4. Proposed files

| File | Responsibility |
|------|----------------|
| `electron/services/book-export-pdf-segments.ts` | `buildPdfExportSegments(chapters): PdfExportSegment[]`; inter-document gap; split on pagebreak lines (exclude directive from body) |
| `electron/services/book-export-pdf-html.ts` | `renderSegmentPrintHtml(segment, index, metadata, projectRoot): Promise<string>`; embed print CSS; segment 0 vs body-only |
| `electron/services/book-export-pdf-print.css` | `@page`, A4, margins, Times New Roman, `.trama-center`, `.trama-spacer`, chapter sections |
| `electron/services/book-export-pdf-print.ts` | Singleton `BrowserWindow`, queue, `printHtmlFileToPdf(htmlPath, options)`, test injection hook |
| `electron/services/book-export-pdf-merge.ts` | `mergePdfSegments(buffers: Uint8Array[]): Promise<Uint8Array>` |
| `electron/services/book-export-pdf-renderer.ts` | Barrel: `renderPdfBook(chapters, metadata, projectRoot)` orchestrating above |
| `tests/book-export-pdf-segments.test.ts` | Split + gap logic (node) |
| `tests/book-export-pdf-merge.test.ts` | Merge order + page count (node, tiny PDF fixtures) |
| `tests/book-export-pdf-print.test.ts` | Mock print surface; orchestration without real Chromium (node) |

**Delete after green tests:**

- `book-export-pdf-utils.ts`
- `book-export-pdf-chapters.ts`
- `book-export-pdf-inline.ts`
- `book-export-pdf-fonts.ts`
- `book-export-pdf-font-utils.ts`
- `tests/book-export-pdf-inline.test.ts`

Update `docs/live/file-map.md` when files are created/deleted.

## 5. Data model

```typescript
/** One printable unit: ordered slice of chapter bodies (markdown, still sanitized). */
interface PdfExportSegment {
  /** Chapters fully or partially included, in export order. */
  chapters: Array<{
    path: string
    /** Markdown for this segment only (subset of chapter.content). */
    content: string
  }>
}
```

Implementation note: splitting can produce one segment with multiple chapter entries, or one chapter split across segments (only if a pagebreak appears mid-file — rare but must work).

### Segment split algorithm (reference)

```
state: currentSegment = empty
lastEndedWithPagebreak = false

for each chapter in chapters (ordered):
  if not first chapter and not lastEndedWithPagebreak:
    append inter-document gap to current segment body (two "\n" lines — see implementation choice below)

  for each line in chapter.content.split('\n'):
    if parseDirectiveLine(line)?.kind === 'pagebreak':
      flush currentSegment; start new empty segment
      lastEndedWithPagebreak = true
    else:
      append line to current chapter slice in currentSegment
      lastEndedWithPagebreak = false

flush final segment
```

**Inter-document gap:** Prefer inserting a marker consumed by HTML render (e.g. two empty paragraphs) or literal `\n\n` between chapter blocks inside the segment markdown stream — match legacy vertical space, not a `trama:spacer` directive unless tests require it.

**Pagebreak lines:** Never emitted into segment HTML.

## 6. Implementation slices

Execute in order. Each slice should leave `npm run lint` and targeted tests green.

### Slice 1 — Segments (pure, no Electron)

- [x] Implement `buildPdfExportSegments` in `book-export-pdf-segments.ts`
- [x] Reuse `parseDirectiveLine` from `book-export-directives.ts` (do not duplicate pagebreak regex)
- [x] Tests: single doc no break → 1 segment; two breaks → 3 segments; two chapters + gap; chapter ends with pagebreak → no gap before next; mid-file break splits one chapter across segments

### Slice 2 — Segment HTML

- [x] `book-export-pdf-html.ts`: for each chapter in segment, `replaceDirectivesForHtml` + `marked.parse` → `<section class="trama-chapter" data-path="...">`
- [x] Extract shared print `<style>` from inline string; load `book-export-pdf-print.css` (readFile at runtime or build-time string import — match project patterns)
- [x] Segment 0: reuse header pattern from `renderHtmlTemplate` in `book-export-renderers.ts` (title, author) but **print** CSS, not screen `max-width: 760px`
- [x] Segment 1+: minimal `<!doctype html><html><head>…print css…</head><body>…sections…</body></html>`
- [x] Unit test (node): HTML string contains Times New Roman, no duplicate `<h1>` on segment 1+, pagebreak directive absent

### Slice 3 — Print surface

- [x] `book-export-pdf-print.ts`:
  - `getBookExportPrintSurface(): PrintSurface`
  - `setBookExportPrintSurfaceForTests(mock: PrintSurface | null)`
  - Internal mutex: `async runExclusive<T>(fn: () => Promise<T>)`
  - Lazy hidden `BrowserWindow` (`show: false`, reasonable `webPreferences`)
  - `printHtmlFileToPdf(absoluteHtmlPath): Promise<Uint8Array>`:
    - `loadFile` → wait `did-finish-load` (and `did-fail-load` → reject)
    - `printToPDF({ printBackground: true, pageSize: 'A4', marginsType: … })` — tune margins to approximate legacy 50pt if possible
    - log warnings on failure
- [x] Temp dir per export job: `mkdtemp` under `os.tmpdir()`, write `segment-000.html`, delete tree in `finally` (`withBookExportTempDirectory`; orchestrator writes segment files in Slice 5)

### Slice 4 — Merge

- [x] `mergePdfSegments` in `book-export-pdf-merge.ts` (linear loop, see ADR)
- [x] Tests: merge two one-page fixture PDFs (generate via pdf-lib in test setup) → page count sum

### Slice 5 — Orchestrator + wire-up

- [x] New `renderPdfBook(chapters, metadata, projectRoot)`:
  1. `segments = buildPdfExportSegments(chapters)`
  2. `tmpdir = mkdtemp(...)`
  3. `buffers = []`; for `i, seg` of segments: write HTML → `printHtmlFileToPdf` → push buffer
  4. `return mergePdfSegments(buffers)`
  5. cleanup tmpdir; log segment count at `console` level for debug
- [x] Update `book-export-service.ts` case `pdf`: pass `metadata` into `renderPdfBook`
- [x] Update barrel `book-export-pdf-renderer.ts`

### Slice 6 — Tests & legacy removal

- [x] Add `tests/helpers/pdf-text-extract.ts` (optional): load PDF with `pdf-lib` or `pdf-parse` if already a dep — else assert page count + embed checks only
- [x] Refactor `tests/book-export-renderers.test.ts`:
  - Inject mock print surface returning minimal valid PDF bytes **or** mark PDF tests `@vitest-environment` that supports Electron if project adds it
  - **Recommended:** mock returns fixed multi-page buffer for merge tests; for renderer tests, mock inspects written HTML temp file path passed to print (capture path in mock)
- [x] Delete legacy pdf-lib layout files and `book-export-pdf-inline.test.ts`
- [x] Run full suite: `npm run test -- tests/book-export`

### Slice 7 — Documentation & cleanup

- [x] `docs/architecture/book-export-architecture.md`: flip “implementación pendiente” → implemented; remove legacy section or move to `docs/plan/done/`
- [x] `docs/live/current-status.md`: PDF uses printToPDF
- [x] `docs/live/file-map.md`: new/deleted files
- [x] `docs/lessons-learned/`: entry if e.g. `data:` URL limits, `printToPDF` margin quirks, merge mutex
- [x] ADR 0004: set status `accepted` → note implemented date in architecture doc (ADR stays immutable body; optional status line update)

## 7. Test strategy

| Layer | What to verify |
|-------|----------------|
| `book-export-pdf-segments.test.ts` | Split boundaries, gaps, empty book, adjacent pagebreaks → empty segment policy (document: two consecutive pagebreaks → middle segment may be empty; skip printing 0-content segments or emit blank page — **pick one and test**) |
| `book-export-pdf-merge.test.ts` | Page order preserved; single segment passthrough |
| `book-export-pdf-print.test.ts` | Mutex serializes; mock receives html path; cleanup deletes temp |
| `book-export-renderers.test.ts` | Existing PDF cases: Unicode, center, images (data URL, local, ref-style, inline), pagebreak across segments (content after break on new page — assert page count ≥ 2 or text on page 2) |

**Empty segment policy (decide in Slice 1):** If author writes two pagebreaks in a row, either skip 0-byte segments or print one blank page. Recommend **skip** (no `printToPDF` call) to avoid blank pages in output.

**Environment:** Keep unit tests on `node` with **injected mock** print surface. Do not require headed Electron in CI for default `npm test`. Optional manual: export `example-fantasy` to PDF and compare wall-clock to legacy (subjective).

## 8. `printToPDF` options (starting point)

```typescript
await webContents.printToPDF({
  printBackground: true,
  pageSize: 'A4',
  marginsType: 1, // or custom marginsType if Electron version supports — verify against Electron in package.json
})
```

Tune in `book-export-pdf-print.css`:

```css
@page { size: A4; margin: …; }
body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; }
```

Align spacer/center classes with `book-export-renderers.ts` HTML export for predictability.

## 9. IPC / UI

No IPC schema changes. `trama:book:export` unchanged. No renderer work unless export dialog error messages need updating.

## 10. Debug playbook

1. Log `segmentCount` at start of PDF export.
2. On failure, log `segment index` and retain temp dir path when `TRAMA_DEBUG_EXPORT=1` (optional env — only if trivial).
3. Open failing `segment-NNN.html` in browser → Print preview.
4. Confirm merge page count = sum of segment page counts.
5. Tests: `npm run test -- tests/book-export-pdf-segments.test.ts tests/book-export-renderers.test.ts`

## 11. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| `printToPDF` slower than hoped on huge single segment | Author pagebreaks already split; document that authors can add breaks for very large books |
| Large base64 images in HTML temp files | Same as today’s data URL preprocess; temp disk not `data:` URL |
| Concurrent exports | Mutex on print surface |
| CI without font metrics | Functional tests via mock; manual smoke on Windows/macOS/Linux periodically |
| ESLint `max-lines` | Split html vs print vs segments early |

## 12. Definition of done

- [x] `renderPdfBook` uses HTML + print + merge only; legacy layout files deleted
- [x] `metadata` passed for PDF (title/author on segment 0)
- [x] All `tests/book-export*.test.ts` green
- [x] `npm run lint` clean (book-export modules; repo may have unrelated max-lines debt)
- [x] Architecture doc reflects implemented state
- [x] file-map updated

## 13. Post-implementation handoff

1. Canonical reference: `docs/architecture/book-export-architecture.md` (Export PDF + debug playbook).
2. PDF layout gotchas: `docs/lessons-learned/book-export-pdf-print-surface.md`.
3. Focused tests: `npm run test -- tests/book-export`.
4. After CSS or print-surface changes: `npm run build:electron` (copies `book-export-pdf-print.css` to `dist-electron`).
5. Legacy pdf-lib layout modules are deleted; `pdf-lib` remains only for `mergePdfSegments`.
