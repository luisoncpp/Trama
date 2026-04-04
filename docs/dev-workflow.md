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
2. Open Electron window and use `Elegir carpeta` to load a markdown project.
3. Confirm preload status is available and documents load/save correctly.
4. Run `npm run test` before finishing changes.

## Adding a new IPC endpoint

1. Add channel + request/response schemas in `src/shared/ipc.ts`.
2. Implement handler in `electron/ipc/handlers/`:
  - Use `electron/ipc/handlers/project-handlers/` for project/document/index handlers.
  - Use `electron/ipc/handlers/ping-handler.ts` for ping-style utility endpoints.
3. Expose method in `electron/preload.cts`.
4. Register channel in `electron/ipc.ts`.
5. Consume from renderer hooks/components (currently under `src/features/project-editor/`).
5. Add tests in `tests/` for valid/invalid payloads.

## Build artifact expectations

After `npm run build:electron`:

- `dist-electron/electron/main.js`
- `dist-electron/electron/ipc.js`
- `dist-electron/electron/preload.cjs`
- `dist-electron/electron/ipc/handlers/index.js`
- `dist-electron/src/shared/ipc.js`

If `preload.cjs` is missing, preload will not load and `window.tramaApi` will be undefined.
