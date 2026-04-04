# Development Workflow

## Main commands

- `npm run dev`
  - Starts Vite + Electron desktop flow.
- `npm run build`
  - Builds renderer and Electron outputs.
- `npm run test`
  - Runs Vitest suite.

## Useful partial commands

- `npm run dev:renderer`
  - Start only Vite.
- `npm run build:electron`
  - Compile only Electron TS layer.
- `npm run dev:electron`
  - Launch Electron against local Vite URL.

## Typical development loop

1. Start with `npm run dev`.
2. Open Electron window and use `Probar round-trip IPC`.
3. Confirm preload status is available.
4. Run `npm run test` before finishing changes.

## Adding a new IPC endpoint

1. Add channel + request/response schemas in `src/shared/ipc.ts`.
2. Implement main handler in `electron/ipc.ts`.
3. Expose method in `electron/preload.cts`.
4. Consume from renderer (`src/app.tsx` or future hooks/services).
5. Add tests in `tests/` for valid/invalid payloads.

## Build artifact expectations

After `npm run build:electron`:

- `dist-electron/electron/main.js`
- `dist-electron/electron/ipc.js`
- `dist-electron/electron/preload.cjs`
- `dist-electron/src/shared/ipc.js`

If `preload.cjs` is missing, preload will not load and `window.tramaApi` will be undefined.
