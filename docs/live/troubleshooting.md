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

### Quick checks

1. Run `npm run test -- tests/rich-markdown-editor.test.ts` and verify find tests pass.
2. In app: focus editor, press Ctrl/Cmd+F, type query, confirm focus remains in input.
3. Press Enter/Shift+Enter and confirm highlight moves with counter updates.

## 12) Split-pane dirty flag appears in wrong pane

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
2. Open `src/features/project-editor/components/workspace-editor-panels.tsx` and verify split-pane editors call `updateEditorValue(..., pane)`.
3. Open `src/features/project-editor/use-project-editor-ui-actions.ts` and verify pane-targeted update behavior exists and fallback is only for legacy/single-pane paths.
4. Run focused regression: `npm run test -- tests/project-editor-conflict-flow.test.ts`.
5. If needed, run compile guard: `npm run test -- tests/typescript-compile.test.ts`.

### Guardrail

- For split-editor callbacks, prefer pane-targeted actions over globally inferred pane state.
