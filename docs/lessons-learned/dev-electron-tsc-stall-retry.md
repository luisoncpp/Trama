# Dev Electron TypeScript Stall Retry

## Date

2026-04-04

## Symptom

- `npm run dev` intermittently gets stuck at:
  - `npm run build:electron`
  - `tsc -p tsconfig.electron.json`
- No further output appears, and Electron never launches.

## Why this was painful

- The issue was flaky: it could happen twice in a row and then disappear for long stretches.
- Because the compile step blocks startup, the full desktop dev flow looked broken until a manual restart.

## Fix applied

- Updated desktop wait condition from raw TCP to HTTP readiness:
  - `wait-on http-get://localhost:5173 --timeout 30000`
- Hardened main-window visibility in `electron/main.ts`:
  - register show listeners before renderer load
  - force `show()` once load completes to avoid hidden-window race states

## Result

- Dev startup now has a stronger readiness gate and deterministic main-window show flow.
- CI/prod build path remains unchanged (`build:electron` still calls raw `tsc`).

## Follow-up if this reappears frequently

- Run `npm run build:electron` manually once to check for deterministic compiler errors.
- If startup still hangs, capture `MAIN_STARTUP_FAIL`, `MAIN_LOAD_DEV_URL`, `MAIN_DID_FINISH_LOAD`, and `MAIN_READY_TO_SHOW` logs to isolate whether failure is before or after renderer load.
