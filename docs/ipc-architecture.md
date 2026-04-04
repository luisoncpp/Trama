# IPC Architecture Guide

## Purpose

This document explains how IPC is structured today so contributors can add endpoints without reintroducing monolithic files.

## Layering

1. Shared contract layer
- File: `src/shared/ipc.ts`
- Owns channel names, request/response schemas, event schemas, and envelope types.
- This file is the single source of truth for IPC types.

2. Registration layer
- File: `electron/ipc.ts`
- Registers channels with `ipcMain.handle(...)`.
- Delegates all business logic to handler modules.
- Exports `buildPingResponse` and `shutdownIpcServices` for tests/runtime usage.

3. Handler modules
- Folder: `electron/ipc/handlers/`
- `ping-handler.ts`: ping endpoint implementation.
- `project-handlers/`: project/document/index handlers grouped by concern.

4. Runtime/session state
- File: `electron/ipc-runtime.ts`
- Holds active project root, active index service, watcher lifecycle, and external event forwarding.

5. Error helper
- File: `electron/ipc-errors.ts`
- Provides consistent `errorEnvelope(...)` shape.

## Current endpoint mapping

- `trama:ping` -> `handlers/ping-handler.ts`
- `trama:project:open` -> `handlers/project-handlers/project-open-handler.ts`
- `trama:project:select-folder` -> `handlers/project-handlers/project-folder-dialog-handler.ts`
- `trama:document:read` -> `handlers/project-handlers/document-handlers.ts`
- `trama:document:save` -> `handlers/project-handlers/document-handlers.ts`
- `trama:index:get` -> `handlers/project-handlers/index-handler.ts`

Events:
- `trama:project:external-file-event` is emitted from `ipc-runtime.ts` when watcher classifies a change as `external`.

## Add-a-new-endpoint checklist

1. Add channel + schemas + types in `src/shared/ipc.ts`.
2. Implement handler in `electron/ipc/handlers/...` (choose feature folder by concern).
3. Register handler in `electron/ipc.ts`.
4. Expose preload method in `electron/preload.cts`.
5. Extend global API typing in `src/types/trama-api.d.ts`.
6. Consume from renderer feature hook/view.
7. Add tests (unit + contract-level where relevant).

## Design rules

- Keep `electron/ipc.ts` thin.
- Keep handlers stateless where possible; use `ipc-runtime.ts` for session state.
- Return envelopes for predictable renderer handling.
- Validate inputs before side effects.
- Avoid moving channel literals outside `src/shared/ipc.ts`.
