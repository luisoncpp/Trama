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

- Added `scripts/build-electron-with-retry.cjs`.
- New script runs Electron TypeScript compile with:
  - timeout (`60s`)
  - retry (`3` attempts)
  - short delay between retries (`1.2s`)
- Updated `package.json`:
  - `build:electron:guarded` -> `node scripts/build-electron-with-retry.cjs`
  - `dev:electron` now uses guarded build before launching Electron.

## Result

- Intermittent hangs in the Electron compile step now self-recover without manual restart in most cases.
- CI/prod build path remains unchanged (`build:electron` still calls raw `tsc`).

## Follow-up if this reappears frequently

- Run `npm run build:electron` manually once to check for deterministic compiler errors.
- If the guarded script times out repeatedly, capture terminal output and investigate TypeScript process-level hangs in the environment (antivirus/file-locking/path watcher interactions).
