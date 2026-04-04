# Implementation Overview (Phase 1)

## What is implemented

Phase 1 delivers a working desktop shell with one verified round-trip IPC call:

- Renderer (Preact) calls `window.tramaApi.ping(...)`
- Preload forwards via `ipcRenderer.invoke(...)`
- Main process handles via `ipcMain.handle(...)`
- Main returns a typed envelope (`ok: true|false`)
- Renderer displays result or error

## Runtime architecture

- **Renderer process**: UI and user interactions (`src/app.tsx`)
- **Preload script**: safe API bridge (`electron/preload.cts`)
- **Main process**: app lifecycle + IPC registration (`electron/main.ts`, `electron/ipc.ts`)
- **Shared contract**: IPC channels, schemas, and envelope types (`src/shared/ipc.ts`)

## Security baseline

Configured in `electron/window-config.ts`:

- `nodeIntegration: false`
- `contextIsolation: true`
- `webSecurity: true`
- `sandbox: false` (temporary practical choice for this baseline; see troubleshooting)

## IPC contract model

IPC responses use a global envelope pattern:

- Success: `{ ok: true, data: ... }`
- Failure: `{ ok: false, error: { code, message, details? } }`

Validation is done with `zod` in main process before producing a response.

## Why this matters for later phases

This baseline creates stable seams for future work:

- Add new channels by extending `src/shared/ipc.ts`
- Implement channel handlers in `electron/ipc.ts` or feature modules
- Expose new preload methods in `electron/preload.cts`
- Consume typed APIs in renderer components/hooks

## Known tradeoffs

- Dev startup currently uses `concurrently + wait-on`; if Electron exits, `concurrently` may end all child processes.
- Preload was migrated to `.cts` so emitted artifact is `preload.cjs`, which is loaded explicitly by main.
