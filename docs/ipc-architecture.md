# IPC Architecture Guide

## Purpose

This document explains the IPC structure so contributors can add endpoints without growing monolithic files.

## Layering

1. Shared contract layer
- File: `src/shared/ipc.ts`
- Owns channel names, request/response schemas, event schemas, and envelope types.
- Single source of truth for IPC typing and validation model.

2. Registration layer
- File: `electron/ipc.ts`
- Registers channels with `ipcMain.handle(...)`.
- Delegates business logic to handler modules.

3. Handler modules
- Folder: `electron/ipc/handlers/`
- `ping-handler.ts`: ping endpoint.
- `project-handlers/*`: project/document/index handlers.

4. Runtime/session state
- File: `electron/ipc-runtime.ts`
- Holds active project root, index service, watcher lifecycle, and external event forwarding.

5. Error helper
- File: `electron/ipc-errors.ts`
- Provides consistent `errorEnvelope(...)` shape.

## Current endpoint mapping

Request/response channels:
- `trama:ping` -> `handlers/ping-handler.ts`
- `trama:debug:log` -> validation + `console.log` in `electron/ipc.ts`
- `trama:project:open` -> `handlers/project-handlers/project-open-handler.ts`
- `trama:project:select-folder` -> `handlers/project-handlers/project-folder-dialog-handler.ts`
- `trama:document:read` -> `handlers/project-handlers/document-handlers.ts`
- `trama:document:save` -> `handlers/project-handlers/document-handlers.ts`
- `trama:document:create` -> `handlers/project-handlers/document-handlers.ts`
- `trama:document:rename` -> `handlers/project-handlers/document-handlers.ts`
- `trama:document:delete` -> `handlers/project-handlers/document-handlers.ts`
- `trama:folder:create` -> `handlers/project-handlers/document-handlers.ts`
- `trama:index:get` -> `handlers/project-handlers/index-handler.ts`

Event channel:
- `trama:project:external-file-event` emitted from `ipc-runtime.ts` when watcher classifies a change as `external`.

## Add-a-new-endpoint checklist

1. Add channel + schemas + types in `src/shared/ipc.ts`.
2. Implement handler in `electron/ipc/handlers/...` by concern.
3. Register handler in `electron/ipc.ts`.
4. Expose preload method in `electron/preload.cts`.
5. Extend global API typing in `src/types/trama-api.d.ts`.
6. Consume from renderer feature hooks/components.
7. Add tests (contract + behavior).

## Design rules

- Keep `electron/ipc.ts` thin.
- Keep handlers mostly stateless; use `ipc-runtime.ts` for process/session state.
- Validate before side effects.
- Return envelope responses always.
- Never duplicate channel literals outside `src/shared/ipc.ts`.

## Common mistakes and fast checks

If an IPC feature appears broken, validate in this order:

1. Channel exists in `src/shared/ipc.ts`.
2. Channel is registered in `electron/ipc.ts`.
3. Handler exported from both handler index files.
4. Preload method exists in `electron/preload.cts`.
5. Type declaration exists in `src/types/trama-api.d.ts`.
6. Renderer is invoking `window.tramaApi` method with the expected payload.
