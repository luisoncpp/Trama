# Implementation Overview (Phase 2 Kickoff)

## What is implemented

The project now includes the Phase 1 baseline plus a Phase 2 kickoff slice:

- Open project by root path from renderer
- Recursive project scan for `.md` documents
- Frontmatter parse/serialize in main process
- Read/save markdown documents through typed IPC
- `.trama.index.json` reconciliation (prune missing + append new)
- Minimal editor loop in renderer with autosave debounce

## Runtime architecture

- **Renderer process**: UI and user interactions (`src/app.tsx`)
- **Preload script**: safe API bridge (`electron/preload.cts`)
- **Main process**: app lifecycle + IPC orchestration (`electron/main.ts`, `electron/ipc.ts`)
- **Phase 2 services**:
	- `electron/services/project-scanner.ts`
	- `electron/services/document-repository.ts`
	- `electron/services/frontmatter.ts`
	- `electron/services/index-service.ts`
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

Implemented channels at this stage:

- `trama:ping`
- `trama:project:open`
- `trama:document:read`
- `trama:document:save`
- `trama:index:get`

## Why this matters for later phases

Current seams are ready for deeper Phase 2 work:

- Add new channels by extending `src/shared/ipc.ts`
- Keep orchestration in `electron/ipc.ts` and move business logic to services
- Expose new preload methods in `electron/preload.cts`
- Consume typed APIs in renderer components/hooks
- Extend current loop with dirty-state conflict handling and external watcher events

## Known tradeoffs

- Dev startup currently uses `concurrently + wait-on`; if Electron exits, `concurrently` may end all child processes.
- Preload was migrated to `.cts` so emitted artifact is `preload.cjs`, which is loaded explicitly by main.
- Frontmatter parser now uses a dedicated YAML library for robust metadata parsing.
