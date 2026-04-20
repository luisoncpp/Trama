# AI Import/Export Implementation Map

Purpose: plan and implement AI import/export without scanning many files manually.

Dedicated export execution plan:
- `docs/plan/done/ai-export-implementation-plan.md`

Status snapshot (April 2026):
- AI import: implemented end-to-end, with `replace` and `append` modes for existing files.
- AI export: implemented end-to-end (backend hardening + renderer UX + regression tests).

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
  - Import hook (preview + execute, including import mode).
- `src/features/project-editor/use-ai-export.ts`
  - Export hook (dialog state + export IPC + clipboard copy).
- `src/features/project-editor/components/ai-import-dialog.tsx`
  - Import modal UI and `append`/`replace` selection.
- `src/features/project-editor/components/ai-import-preview-section.tsx`
  - Import preview list.
- `src/features/project-editor/components/ai-export-dialog.tsx`
  - Export modal controller.
- `src/features/project-editor/components/ai-export-dialog-body.tsx`
  - Export modal body (multi-select + include frontmatter + actions).
- `src/features/project-editor/components/sidebar/sidebar-transfer-content.tsx`
  - Dedicated sidebar section for import/export actions.
- `src/features/project-editor/project-editor-view.tsx`
  - Wires import/export hooks and dialogs into app.

## Export UX status

Implemented:
1. Export action trigger in renderer UI (Explorer header button).
2. Export dialog with multi-select file list (`state.visibleFiles`) and select-all toggle.
3. `window.tramaApi.aiExport` call with selected relative paths.
4. Clipboard copy of returned `formattedContent`.
5. Error surface in dialog (`lastError`) and safe close/escape behavior during export.

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

- Security hardening applied:
  - Export service now validates relative path segments and blocks traversal/path-escape before read.
  - Guard model aligned with `electron/services/document-repository.ts`.

- Selection model is single-active-path today:
  - `selectedPath` is single-value editor focus state.
  - Do not overload it for export multi-select.

## Test baseline and coverage

Existing:
- `tests/ai-import-parser.test.ts`.

Added:
1. `tests/ai-export-service.test.ts`
  - Multiple files formatting.
  - Include/exclude frontmatter behavior.
  - Missing file and invalid-path handling.
2. `tests/ai-export-ipc-handler.test.ts`
  - IPC-level envelope behavior for invalid/valid payloads.
3. `tests/use-ai-export.test.ts`
  - Renderer export flow (IPC call + clipboard copy + error state).

## Implementation checklist (export)

1. Create renderer hook (`use-ai-export.ts`). ✅
2. Create export dialog components (`ai-export-dialog.tsx`, `ai-export-dialog-body.tsx`). ✅
3. Add export trigger in sidebar header (near import). ✅
4. Wire hook/dialog in `project-editor-view.tsx`. ✅
5. Add error feedback in export UI flow. ✅
6. Harden export service path validation. ✅
7. Add service/IPC/renderer regression tests. ✅
8. Update docs (`current-status`, `file-map`, this map). ✅

## Import existing-file modes

Implemented:
1. `replace`
  - Imported content replaces the full content of existing files.
2. `append`
  - Imported content is appended to the end of existing files.
3. Preview and execution share the same `importMode` contract.
4. Regression coverage added for service, IPC handler, and renderer hook.

## Quick open list for export work

Open these first:
1. `docs/START-HERE.md`
2. `docs/live/file-map.md`
3. `src/shared/ipc.ts`
4. `electron/services/ai-export-service.ts`
5. `src/features/project-editor/project-editor-view.tsx`
6. `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
