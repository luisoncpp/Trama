# Troubleshooting and Surprises

This file captures practical issues observed during the current implementation.

## 1) "Preload API: not available"

### Symptom

- UI shows preload API unavailable.
- IPC button fails with missing `window.tramaApi.ping`.

### Root causes seen

- Preload file path did not match emitted artifact.
- Preload emitted in ESM shape that did not load reliably for this setup.

### Current fix

- Preload source is `electron/preload.cts`.
- Main loads `preload.cjs` explicitly.
- Build emits `dist-electron/electron/preload.cjs`.

### Quick checks

- Verify `dist-electron/electron/preload.cjs` exists.
- Verify `electron/main.ts` points to `preload.cjs`.

## 2) `npm run dev` exits unexpectedly

### Symptom

- Dev starts, then exits with code 1 in terminal.
- `concurrently` reports one process ended and kills the other.

### Root causes seen

- Electron entry script path mismatch (`dist-electron/main.js` vs nested path).
- Electron process exited because window reference was not retained.

### Current fix

- Use `dist-electron/electron/main.js` in scripts.
- Keep global `mainWindow` reference in `electron/main.ts`.

### Note

`concurrently -k` intentionally terminates sibling processes when one exits.

## 3) IPC button stuck in loading state

### Symptom

- Button label remains in loading mode forever.

### Root cause

- Async call lacked robust error/finalization handling.

### Current fix

- `try/catch/finally` in renderer call path.
- Runtime error is displayed in UI.

## 4) Security setting tradeoff (`sandbox`)

### Current value

- `sandbox: false` in `electron/window-config.ts`.

### Why

- Chosen pragmatically to stabilize preload API behavior in this baseline.

### Future hardening task

- Re-evaluate enabling `sandbox: true` once preload behavior is validated with full Phase 2+ architecture.
- If re-enabled, verify preload API and tests before merging.

## 5) Fast recovery checklist

When things break after refactors, run:

1. `npm run build:electron`
2. Confirm files in `dist-electron/electron/`
3. `npm run test`
4. `npm run dev`
5. In app, verify preload status and run IPC button

## 6) Signals for future contributors

- Do not move IPC channel literals only in one layer; keep shared contracts central.
- Keep preload API minimal and explicit.
- Avoid mixing business logic into `main.ts`; route through module-level handlers/services.
