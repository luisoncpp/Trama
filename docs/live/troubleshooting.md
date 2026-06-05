# Troubleshooting and Surprises

This file captures practical issues observed during implementation.

## 1) "Preload API: not available"

### Symptom

- UI shows preload API unavailable.
- IPC actions fail because `window.tramaApi` methods are missing.

### Root causes seen

- Preload file path does not match emitted artifact.
- Preload emitted in a format not loaded by current setup.

### Current fix

- Preload source is `electron/preload.cts`.
- Main loads `preload.cjs` explicitly.
- Build emits `dist-electron/electron/preload.cjs`.

### Quick checks

- Verify `dist-electron/electron/preload.cjs` exists.
- Verify `electron/main.ts` points to `preload.cjs`.

## 2) `npm run dev` exits unexpectedly

### Symptom

- Dev starts, then exits with non-zero code.
- `concurrently` kills sibling process when one command exits.

### Root causes seen

- Electron entry path mismatch.
- Electron exits if BrowserWindow reference is not retained.

### Current fix

- Use `dist-electron/electron/main.js` as Electron entry.
- Keep global `mainWindow` reference in `electron/main.ts`.

## 3) Sidebar actions do not appear or do nothing

### Symptom

- Right-click on file row does not open Rename/Delete menu.
- Rename/Delete opens dialog but action does not apply expected file path.

### Root causes seen

- Context menu handler not wired from tree row to explorer body.
- Section-relative path not remapped to project-relative path before IPC call.

### Current fix

- Tree emits `onFileContextMenu` from file rows only.
- Explorer body uses dedicated context-menu hook.
- Panel layer remaps section-scoped paths to full project paths before calling actions.

### Quick checks

- Open `tests/sidebar-panels.test.ts` and run the context-menu test.
- Confirm selected file path and action target path are aligned.

## 4) Collapse-all does not stay collapsed

### Symptom

- User collapses all folders and UI re-expands unexpectedly.

### Root cause

- Expanded-folder initialization logic can overwrite intentional collapsed state.

### Current fix

- Expanded-folder hook preserves intentional all-collapsed state while still handling selection and filter auto-expand.

## 5) Rich editor cursor jumps to start while typing

### Symptom

- Caret resets to beginning of document in controlled mode.

### Root cause

- Editor initialization effect reruns on value updates.

### Current fix

- Keep editor initialization independent from controlled value updates.
- Use dedicated update path for content sync.

## 6) Security setting tradeoff (`sandbox`)

### Current value

- `sandbox: false` in `electron/window-config.ts`.

### Why

- Pragmatic choice to stabilize preload behavior in current baseline.

### Future hardening task

- Re-evaluate `sandbox: true` after validating preload behavior with full suite and smoke tests.

## 7) Fast recovery checklist

When things break after refactors, run the recovery sequence per `docs/dev-workflow.md`.

## 8) Contributor signals

- Keep IPC literals and schemas centralized in `src/shared/ipc.ts`.
- Keep preload API minimal, typed, and mirrored in declarations.
- Avoid heavy logic in `electron/main.ts` and `electron/ipc.ts`; push into handlers/services.
- For CSS edits, patch in small chunks and re-check file structure.

## 9) `npm run dev` appears stuck at `build:electron`

### Symptom

- Dev startup stops after:
	- `npm run build:electron`
	- `tsc -p tsconfig.electron.json`
- No further output appears and Electron does not open.

### Current mitigation

- Desktop startup now waits for an actual HTTP response (`wait-on http-get://localhost:5173`) before launching Electron.
- Main-process startup now includes explicit error logging (`MAIN_STARTUP_FAIL`) and retryable dev URL load behavior for transient renderer availability races.

### Quick checks

- Run `npm run build:electron` directly to confirm deterministic TypeScript compile status.
- Run `npm run dev` and, if startup fails, capture any `MAIN_STARTUP_FAIL` log line from Electron output.

## 10) Paste from Markdown / Clipboard access

### Symptom

- "Paste Markdown" menu item appears to do nothing, or clipboard text is not inserted into the editor when invoked from the native context menu.

### Root causes

- `navigator.clipboard.readText()` may be unavailable or restricted in certain Electron renderer contexts (sandboxing, permissions, or older Electron versions).
- The native menu dispatch may not target the correct renderer window or the editor may not have focus when the command is executed.

### Current mitigations

- Prefer reading the clipboard from the preload or main process and sending the text to the renderer as payload if `navigator.clipboard.readText()` is unreliable. Expose a `readClipboard()` helper on `window.tramaApi` from `electron/preload.cts` and call it from the renderer handler.
- Ensure the editor has focus before handling the paste command; the current implementation checks `editor.hasFocus()` before inserting.
- Add focused tests (see `tests/paste-markdown.test.ts`) to reproduce and assert behavior in CI.

### Quick checks

1. Verify the renderer receives the workspace event by adding a console log in `src/shared/workspace-context-menu.ts` listener path.
2. Confirm `navigator.clipboard.readText()` is available in the renderer devtools console.
3. If unavailable, implement `window.tramaApi.readClipboard()` in `electron/preload.cts` and call the preload method from the renderer handler.

## 11) In-document Find highlight/focus issues

### Symptom

- Ctrl/Cmd+F opens the floating find bar, but active match is not visually obvious in editor.
- Typing in the find input steals focus back to editor after each character.

### Root causes seen

- Selection updates can move focus to Quill if `editor.focus()` or user-source selection APIs are used in the find loop.
- Updating active match and overlay from unstable callbacks can trigger repeated effects and flaky behavior.

### Current fix

- Keep find input focused while searching; avoid explicit editor focus in query-update flow.
- Use silent selection updates for active match and a separate visual overlay (`editor-find-highlight`) to make the match visible.
- Keep find modules split (`rich-markdown-editor-find.tsx`, `rich-markdown-editor-find-overlay.tsx`, `rich-markdown-editor-find-visual.ts`) to satisfy lint limits.

### Find bar buttons not clickable (Windows overlay titlebar)

#### Symptom

- Ctrl/Cmd+F opens the find bar and the query input works, but Prev/Next/Close/Replace buttons ignore clicks.

#### Root cause seen

- `.editor-findbar` overlaps `.ql-toolbar`, which uses `-webkit-app-region: drag` on `html.has-overlay-titlebar`. Without `no-drag` on the find bar, Electron treats clicks as window-drag instead of button activation.

#### Current fix

- `.editor-findbar` uses higher `z-index`, `-webkit-app-region: no-drag`, and non-shrinking flex children. Editor shell capture handlers skip events inside the find bar.

See `docs/lessons-learned/find-bar-toolbar-click-blocked.md`.

### Quick checks

1. Run `npm run test -- tests/rich-markdown-editor.test.ts` and verify find tests pass.
2. In app: focus editor, press Ctrl/Cmd+F, type query, confirm focus remains in input.
3. Press Enter/Shift+Enter and confirm highlight moves with counter updates.
4. Click Prev/Next/Close and confirm they respond (especially on Windows with overlay titlebar).

## 12) Native menu bar does not appear on Alt (Windows overlay titlebar)

### Symptom

- After enabling the hidden Win32 title bar, pressing Alt does not reveal File / Edit / View.

### Root cause seen

- `autoHideMenuBar: true` is set in `electron/window-config.ts`, but Electron’s built-in Alt toggle is unreliable with `titleBarStyle: 'hidden'` (and was briefly regressed in Electron 39.7+).

### Current fix

- Renderer: `use-menu-bar-reveal-on-alt.ts` listens for bare Left Alt and calls `tramaApi.revealMenuBar()`.
- Main: `electron/main-process/menu-bar-auto-hide.ts` — on Win32 opens `Menu.popup()`; on other platforms toggles the native menu bar.
- **Note:** Menu-bar debugging logs appear in the **terminal running Electron** (`npm run dev`), not in the renderer DevTools console.

### Quick checks

1. Run `npm run test -- tests/menu-bar-alt-key.test.ts tests/menu-bar-auto-hide.test.ts`.
2. Restart `npm run dev`, press **Left Alt** — a menu with File / Edit / View should open (Win32: popup at top-left; macOS/Linux: native strip).
3. On macOS/Linux, click in the editor — the menu bar should hide again.

## 13) Split-pane dirty flag appears in wrong pane

### Symptom

- In split mode, editing in secondary marks primary as dirty (or dirty badge/status appears in the wrong pane).

### Root cause seen

- Change callbacks in split editors were routed through global active-pane state, not the pane that emitted the onChange event.
- In split mode, event ordering and pane activation can diverge briefly, so `activePane` is not always a safe source of truth for edit routing.

### Current fix

- `updateEditorValue` supports explicit pane target: `(value, pane?)`.
- Split-pane UI calls `updateEditorValue(nextValue, pane)` from each pane editor.
- Default fallback remains `pane ?? activePane` for single-pane compatibility.

### Quick checks (fast path)

1. Open `docs/split-pane-coordination.md` to confirm source-of-truth and action-flow assumptions before editing.
2. Open `src/features/project-editor/pane/workspace-editor-panels.tsx` and verify split-pane editors call `updateEditorValue(..., pane)`.
3. Open `src/features/project-editor/use-project-editor-ui-actions.ts` and verify pane-targeted update behavior exists and fallback is only for legacy/single-pane paths.
4. Run focused regression: `npm run test -- tests/project-editor-conflict-flow.test.ts`.
5. If needed, run compile guard: `npm run test -- tests/typescript-compile.test.ts`.

### Guardrail

- For split-editor callbacks, prefer pane-targeted actions over globally inferred pane state.

## 14) Book export PDF — blank page, wrong margins, or layout surprises

### Symptom

- PDF starts with a blank page (often on cover/portada segments).
- `printToPDF` throws “margins must be less than or equal to pageSize”.
- PDF layout differs from Chrome print preview of a saved segment HTML file.

### Root causes seen

- `marked` wraps images in `<p>`; paragraph margins push the cover block to page 2.
- Tall cover images at `max-width: 100%` exceed printable height without `max-height` + `object-fit: contain`.
- Passing Electron `margins` in pixels (~67) instead of inches, or duplicating `@page` margins in `printToPDF` options.
- Stale `dist-electron` print CSS after editing `book-export-pdf-print.css` without `npm run build:electron`.

### Current fix

- Pipeline: HTML **PDF export segments** → `printToPDF` → linear `pdf-lib` merge ([ADR 0004](../adr/0004-book-pdf-via-html-print-segments.md)).
- `normalizePdfPrintChapterBody` unwraps `<p><img>`; print CSS caps image height and zeroes `p` margins in chapters.
- `printToPDF({ printBackground: true, preferCSSPageSize: true })` with margins only in `@page` inside `book-export-pdf-print.css`.

### Quick checks

1. Read `docs/architecture/book-export-architecture.md` (Export PDF + playbook) and `docs/lessons-learned/book-export-pdf-print-surface.md`.
2. Run `npm run test -- tests/book-export`.
3. After CSS changes: `npm run build:electron`, then re-export.
4. To inspect segment HTML before cleanup: pause during export or copy from `%TEMP%\trama-book-export-<random>\segment-000.html` (Windows); open in Chrome → Print preview should match segment 0 PDF.

## 15) App window closes but the Electron process keeps running (need Ctrl+C to exit)

### Symptom

- After exporting to PDF at least once, closing the main app window leaves a dangling Electron process. The terminal shows the process is still alive and the user has to press Ctrl+C to terminate it.
- Most common on Windows and Linux; macOS may mask it because the app stays running by design.

### Root cause

- The PDF print surface (`electron/services/book-export-pdf-print.ts`) lazily creates a hidden `BrowserWindow` to reuse across `printToPDF` calls. The window is cached on the singleton `defaultPrintSurface` and is never destroyed.
- When the user closes the main window, `window-all-closed` triggers `app.quit()`, but the hidden window keeps the Electron process alive because no one destroys it.

### Current fix

- `disposeBookExportPrintSurface()` in `electron/services/book-export-pdf-print.ts` calls `BrowserWindow.destroy()` on the cached hidden window and nulls the singleton.
- Wired into the main-window `closed` handler in `electron/main.ts`, with `before-quit` kept only as fallback. Idempotent and safe to call when no surface has been created.
- Covered by `tests/book-export-pdf-print.test.ts` (dispose is safe with no surface; does not clear an installed test mock).

### Quick checks

1. Reproduce by exporting to PDF, then closing the main window; the process should exit cleanly.
2. Verify the wiring: `electron/main.ts` imports `disposeBookExportPrintSurface` and calls it from `win.on('closed', ...)` for the main window.
3. Run `npm run test -- tests/book-export-pdf-print.test.ts`.

## 16) PDF export finishes but the success toast never appears

### Symptom

- PDF export completes on disk, but the renderer never shows the `Book exported to ...` toast.
- During `npm run dev`, Vite logs a page reload in the middle of export, often mentioning `segment-0.html`.

### Root cause

- A debug write in `electron/services/book-export-pdf-renderer.ts` emitted `./segment-0.html` into the workspace root for the first printable segment.
- Vite watches the workspace root in dev, sees that HTML file change, and reloads the renderer. The export promise in the main process still completes, but the renderer state holding `exporting`/`toastMessage` is torn down and recreated.

### Current fix

- PDF segment HTML stays inside `withBookExportTempDirectory(...)` only.
- No repo-root `segment-0.html` artifact is written anymore.
- Covered by `tests/book-export-renderers.test.ts`, which asserts that `renderPdfBook(...)` does not create `segment-0.html` in `process.cwd()`.

### Quick checks

1. Export a PDF in dev and confirm Vite no longer logs `page reload segment-0.html`.
2. Confirm the toast appears after export completes.
3. Run `npm run test -- tests/book-export-renderers.test.ts`.
