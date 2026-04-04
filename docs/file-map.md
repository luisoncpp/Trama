# File Map and Responsibilities

## Root-level project files

- `package.json`
  - Scripts for dev/build/test.
  - Electron entry configured via `main`.
- `vite.config.ts`
  - Preact plugin and Vitest config.
- `postcss.config.js`
  - Tailwind PostCSS plugin.
- `tsconfig.electron.json`
  - Compiles main/preload/shared contracts to `dist-electron`.

## Electron layer

- `electron/main.ts`
  - App lifecycle (`app.whenReady`, `window-all-closed`).
  - Creates BrowserWindow with preload.
  - Registers IPC handlers.
  - Keeps global window reference to prevent early process exit.
- `electron/window-config.ts`
  - BrowserWindow security-related defaults.
- `electron/ipc.ts`
  - `buildPingResponse` validation + response.
  - `registerIpcHandlers` for channel registration.
- `electron/preload.cts`
  - Exposes `window.tramaApi` with `contextBridge`.

## Renderer layer

- `src/app.tsx`
  - Shell UI for Phase 1.
  - IPC test button and runtime diagnostics.
- `src/index.css`
  - Tailwind import + minimal global styles.
- `src/types/trama-api.d.ts`
  - Global TypeScript declaration for `window.tramaApi`.

## Shared contracts

- `src/shared/ipc.ts`
  - Channel constants.
  - Zod schemas for request/response/error.
  - Shared TypeScript envelope types.

## Tests

- `tests/startup-smoke.test.ts`
  - Verifies secure window config values.
- `tests/ipc-contract.test.ts`
  - Valid payload => success envelope.
  - Invalid payload => validation error envelope.

## Build outputs

- `dist/`
  - Vite renderer build.
- `dist-electron/`
  - Transpiled Electron and shared runtime files.
  - Expected preload artifact: `dist-electron/electron/preload.cjs`.
