# AI Import/Export Implementation Map

Purpose: plan and implement AI import/export without scanning many files manually.

Dedicated export execution plan:
- `docs/ai-export-implementation-plan.md`

Status snapshot (April 2026):
- AI import: implemented end-to-end.
- AI export: backend contract/service implemented; renderer UX and dedicated tests pending.

## Canonical format

Delimited format used by import and export:

`=== FILE: relative/path.md ===`

Parser source of truth:
- `src/shared/ai-import-parser.ts`

## Current implementation map

### Shared contract

- `src/shared/ipc.ts`
  - Channels: `aiImport`, `aiImportPreview`, `aiExport`
  - Schemas/types: `AiImport*`, `AiExport*`

### Main process

- `electron/ipc.ts`
  - Registers AI handlers.
- `electron/ipc/handlers/ai-handlers.ts`
  - `handleAiImportPreview`
  - `handleAiImport`
  - `handleAiExport`
- `electron/services/ai-import-service.ts`
  - Parse/preview/execute import.
- `electron/services/ai-export-service.ts`
  - Format exported clipboard content.

### Preload and renderer API

- `electron/preload.cts`
  - Exposes `tramaApi.aiImportPreview`, `tramaApi.aiImport`, `tramaApi.aiExport`.
- `src/types/trama-api.d.ts`
  - Global typings for `window.tramaApi`.

### Renderer UI

- `src/features/project-editor/use-ai-import.ts`
  - Import hook (preview + execute).
- `src/features/project-editor/components/ai-import-dialog.tsx`
  - Import modal UI.
- `src/features/project-editor/components/ai-import-preview-section.tsx`
  - Import preview list.
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
  - Import button in sidebar header.
- `src/features/project-editor/project-editor-view.tsx`
  - Wires import hook/dialog into app.

## What is missing for export UX

1. Export action trigger in renderer UI (button/menu).
2. Export dialog to select files from list (multi-select).
3. Call `window.tramaApi.aiExport` with selected paths.
4. Copy returned `formattedContent` to clipboard.
5. Clear success/error feedback in UI.

## Selection source options

Preferred first implementation:
- Export dialog with checkbox list built from `state.visibleFiles`.
- Optional filters:
  - section scope (`book/`, `outline/`, `lore/`)
  - text search

Why:
- Avoids invasive changes in current tree selection model.
- Keeps feature isolated and easier to test.

## Known constraints and risks

- Security hardening gap:
  - AI import/export services currently resolve paths directly from `projectRoot` without using repository path guards.
  - Reference guard implementation: `electron/services/document-repository.ts`.

- Selection model is single-active-path today:
  - `selectedPath` is single-value editor focus state.
  - Do not overload it for export multi-select.

## Test baseline and missing coverage

Existing:
- `tests/ai-import-parser.test.ts`.

Missing (recommended):
1. `tests/ai-export-service.test.ts`
  - Multiple files formatting.
  - Include/exclude frontmatter behavior.
  - Missing file handling.
2. Renderer dialog tests (selection + copy flow).
3. IPC-level contract test for export envelope behavior.

## Implementation checklist (export)

1. Create renderer hook (example: `use-ai-export.ts`).
2. Create export dialog component (example: `ai-export-dialog.tsx`).
3. Add export trigger in sidebar header (near import).
4. Wire hook/dialog in `project-editor-view.tsx`.
5. Add status strings for success/failure user feedback.
6. Harden export service path validation.
7. Add unit/integration tests.
8. Update docs:
  - `docs/current-status.md`
  - `docs/file-map.md`
  - `docs/README.md`

## Quick open list for export work

Open these first:
1. `docs/START-HERE.md`
2. `docs/file-map.md`
3. `docs/ai-import-export-implementation-map.md`
4. `src/shared/ipc.ts`
5. `electron/services/ai-export-service.ts`
6. `src/features/project-editor/project-editor-view.tsx`
7. `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
