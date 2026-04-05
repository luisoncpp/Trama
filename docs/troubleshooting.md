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

- `dev:electron` now calls `build:electron:guarded`.
- Guarded build behavior:
	- timeout after 60s
	- retries up to 3 attempts
	- short delay between retries

### Quick checks

- Run `npm run build:electron:guarded` directly to confirm retries/timeout behavior.
- If all retries fail, run `npm run build:electron` once manually to inspect deterministic TypeScript errors.
