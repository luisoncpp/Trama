# Book export PDF print surface

**Date:** 2026-06-04 (updated 2026-06-05)  
**Component:** `book-export-pdf-print.ts`, `book-export-pdf-print.css`, `book-export-pdf-html.ts`, `book-export-renderers.ts`, `book-export-directives.ts`

## Facts

- **Page size and margins:** `printToPDF({ printBackground: true, preferCSSPageSize: true })` with `@page { size: A4; margin: 1.764cm; }` in `book-export-pdf-print.css`. Do not also pass `margins` in `printToPDF` — double margins cause layout surprises. If you must use Electron `margins` instead, values are in **inches** (defaults `0.4`), not pixels; `~67` fails with “margins must be less than or equal to pageSize”.
- **Load before print:** `await webContents.loadFile(path)` then `document.fonts.ready` + two `requestAnimationFrame` calls. Avoid `once('did-finish-load')` + `loadFile` on a reused hidden window (race → blank first page).
- **Dynamic Electron import:** `import('electron')` inside the print module so Vitest can import without native Electron.
- **Tests:** Any test calling `renderPdfBook` or IPC `format: 'pdf'` needs `setBookExportPrintSurfaceForTests(createOnePagePdfMockPrintSurface())`. Mock returns one page per segment.
- **Segment HTML temp path (Windows):** `%TEMP%\trama-book-export-<random>\segment-000.html` — deleted when the export job finishes.
- **Do not write debug segment HTML into the repo root during dev:** a stray `./segment-0.html` artifact triggers Vite file watching, reloads the renderer mid-export, and makes the export toast/state disappear even though the main-process export finishes successfully. Keep debug segment HTML inside `withBookExportTempDirectory(...)` only.
- **Pagebreak directives:** Split only in `buildPdfExportSegments`; inside segments use `replaceDirectivesForPdfPrint` (never emit `<div class="trama-pagebreak">`). Strip leading manuscript pagebreaks via `stripLeadingAuthorPagebreaks`.
- **Blank page before cover (common):**
  1. `marked` wraps images in `<p>`; paragraph margins + `break-inside: avoid` push the block to page 2 → fix with `normalizePdfPrintChapterBody` (unwrap `<p><img>`, drop empty `<p>`) and `margin: 0` on `.trama-chapter p` in print CSS.
  2. Tall cover PNG (e.g. 665×997) at `max-width: 100%` exceeds printable height by a few mm → fix with `max-height: 26.17cm` and `object-fit: contain` on `img`.
- **Centered images in PDF:** Print CSS uses `img { display: block; }` for cover layout; `text-align: center` on `.trama-center` does not center block-level images (HTML export works because `marked` leaves images inline inside `<p>`). Add `.trama-center img { margin-left: auto; margin-right: auto; }` — same pattern as `09-quill-theme-overrides.css` `.trama-centered-content img`.
- **No default book title in PDF:** Header on segment 0 only when `metadata.title` / `metadata.author` are set (no “Trama Book Export” fallback).
- **Hidden print window must be destroyed when the main window closes, not only on `before-quit`:** the print surface caches a hidden `BrowserWindow` to reuse across exports (`getBookExportPrintSurface()` → `defaultPrintSurface`). That hidden window itself can block the app from ever reaching `before-quit`, so cleanup must happen in the main-window `closed` path. Fix: `disposeBookExportPrintSurface()` in `electron/main.ts` destroys the cached print window from `win.on('closed')` and leaves `before-quit` only as a fallback. The dispose is also safe to call when no surface exists (idempotent).

## Tests

- `npm run test -- tests/book-export`
- `npm run build:electron` (copies `book-export-pdf-print.css` into `dist-electron`)

## See also

- `docs/architecture/book-export-architecture.md` (Export PDF + debug playbook)
- `docs/live/troubleshooting.md` §14 (blank page / margins quick path)
- ADR [0004](../adr/0004-book-pdf-via-html-print-segments.md)
