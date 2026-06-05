# Book PDF via HTML segments and Electron printToPDF

Status: accepted (implemented 2026-06-04; see `docs/architecture/book-export-architecture.md`)

Book PDF export will stop using manual `pdf-lib` text layout (word wrapping, cursor state, embedded fonts). Instead it will build HTML per **PDF export segment** (content between **Author page break** directives), render each segment with Chromium `webContents.printToPDF`, and merge segment PDFs in memory with `pdf-lib` copyPages only. The goal is speed: markdown→HTML and HTML→PDF are fast; direct PDF drawing was slow. Segments exist so author-intended page breaks appear in the final file—concatenating segment PDFs is the break, not CSS `page-break-after` on one giant HTML document. Typography targets **functional parity** with Times New Roman in print CSS, not pixel match to the legacy renderer.

## Considered options

- **Optimize pdf-lib** (e.g. batch drawing instead of per-word tokens): tried; did not feel faster.
- **Single HTML document + CSS page breaks**: unreliable or insufficient for PDF page boundaries; rejected as the sole mechanism.
- **Parallel segment rendering**: rejected; goal is not parallelism.
- **Quadratic pairwise PDF merge** (save/reload growing PDF each step): rejected; merge must be one accumulator, O(total pages).
- **Puppeteer / external PDF CLI**: rejected; Electron already ships Chromium.

## Consequences

- New modules: segment split, print surface (hidden `BrowserWindow` singleton, injectable for tests), temp HTML files, print CSS, linear merge.
- Remove after migration: `book-export-pdf-utils.ts`, `book-export-pdf-chapters.ts`, `book-export-pdf-inline.ts`, `book-export-pdf-fonts.ts`, `book-export-pdf-font-utils.ts` (layout path only; `pdf-lib` stays for merge).
- **Inter-document gap** (two blank lines between corkboard-ordered files when the prior file did not end with an author page break) is the cross-format standard; HTML export not doing this today is a bug.
- Export UX stays mostly silent; errors/warnings go to the console.
- Tests mock the print surface; functional PDF tests remain, not golden-byte parity.

See `docs/architecture/book-export-architecture.md` for the full pipeline.
