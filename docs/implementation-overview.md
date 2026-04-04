# Implementation Overview (Phase 2 Complete)

For quick onboarding context, read `new-conversation-handoff.md` and `current-status.md` first.

## What is implemented

The project now includes the Phase 1 baseline plus a complete Phase 2 slice:

- Open project via native folder picker from renderer
- Recursive project scan for `.md` documents
- Frontmatter parse/serialize in main process with `yaml`
- Read/save markdown documents through typed IPC
- `.trama.index.json` reconciliation (prune missing + append new)
- External file watcher events (`internal` vs `external`) and conflict handling actions
- Rich markdown visual editor loop with autosave debounce and modular renderer architecture
- Native context menu with spellcheck suggestions and dictionary action

## Runtime architecture

- **Renderer process**: UI and user interactions (`src/app.tsx`)
- **Renderer project editor feature**:
	- `src/features/project-editor/use-project-editor.ts`
	- `src/features/project-editor/project-editor-view.tsx`
	- `src/features/project-editor/components/*`
- **Preload script**: safe API bridge (`electron/preload.cts`)
- **Main process**: app lifecycle + IPC orchestration (`electron/main.ts`, `electron/ipc.ts`)
- **Main-process helpers**:
	- `electron/main-process/context-menu.ts`
	- `electron/main-process/smoke-hooks.ts`
- **IPC handlers (modularized)**:
	- `electron/ipc/handlers/index.ts`
	- `electron/ipc/handlers/ping-handler.ts`
	- `electron/ipc/handlers/project-handlers/*`
- **IPC runtime and helpers**:
	- `electron/ipc-runtime.ts`
	- `electron/ipc-errors.ts`
- **Phase 2 services**:
	- `electron/services/project-scanner.ts`
	- `electron/services/document-repository.ts`
	- `electron/services/frontmatter.ts`
	- `electron/services/index-service.ts`
	- `electron/services/watcher-service.ts`
- **Shared contract**: IPC channels, schemas, and envelope types (`src/shared/ipc.ts`)

See `ipc-architecture.md` for endpoint mapping and extension workflow.

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
- `trama:project:select-folder`
- `trama:document:read`
- `trama:document:save`
- `trama:index:get`
- `trama:project:external-file-event`

## Why this matters for later phases

Current seams are ready for Phase 3+ work:

- Add new channels by extending `src/shared/ipc.ts`
- Keep orchestration in `electron/ipc.ts` and move business logic to modular handlers/services
- Expose new preload methods in `electron/preload.cts`
- Consume typed APIs in renderer components/hooks
- Extend current loop with additional workspace UI and advanced writing workflows

## Known tradeoffs

- Dev startup currently uses `concurrently + wait-on`; if Electron exits, `concurrently` may end all child processes.
- Preload was migrated to `.cts` so emitted artifact is `preload.cjs`, which is loaded explicitly by main.
- Frontmatter parser now uses a dedicated YAML library for robust metadata parsing.
