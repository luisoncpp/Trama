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

When things break after refactors, run:

1. `npm run lint`
2. `npm run test -- tests/sidebar-panels.test.ts`
3. `npm run test -- tests/use-project-editor.test.ts`
4. `npm run build`
5. `npm run test:smoke` (if startup/preload touched)
6. `npm run dev` and manually verify editor + sidebar flows.

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

### Quick checks

1. Run `npm run test -- tests/rich-markdown-editor.test.ts` and verify find tests pass.
2. In app: focus editor, press Ctrl/Cmd+F, type query, confirm focus remains in input.
3. Press Enter/Shift+Enter and confirm highlight moves with counter updates.
