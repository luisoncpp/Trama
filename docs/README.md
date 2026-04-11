# Trama Technical Docs

This folder documents the active implementation so new chats can resume work quickly without re-reading large parts of the codebase.

## Mandatory first stop

Start in `START-HERE.md` before reading anything else.

`START-HERE.md` is the anti-drift entrypoint and always links to:
- `file-map.md`
- `lessons-learned/README.md`
- feature maps (including AI import/export)

## Recommended reading order

1. `START-HERE.md`
2. `new-conversation-handoff.md`
3. `current-status.md`
4. `implementation-overview.md`
5. `ipc-architecture.md`
6. `file-map.md`
7. `ai-import-export-implementation-map.md`
8. `ai-export-implementation-plan.md`
9. `dev-workflow.md`
10. `troubleshooting.md`
11. `lessons-learned/README.md`

## Current scope snapshot

Implemented foundation:

- Electron + Vite + Preact desktop shell.
- Typed IPC contract with runtime validation and envelope responses.
- `contextBridge` preload API (`window.tramaApi`).
- Native folder picker (`selectProjectFolder`).
- Project scan + markdown read/save/create/rename/delete + folder create.
- Index reconciliation (`.trama.index.json`).
- External file watcher and conflict-safe editing flow.
- Rich markdown visual editor.
- Native editor context menu with spellcheck.
- Sidebar sections (manuscript/outline/lore/settings), filter, responsive collapse, and right-click file actions.
- Paste from Markdown: native menu option to convert clipboard Markdown to rich editor content.
- In-document Find: floating find bar (Ctrl/Cmd+F) with next/previous navigation and active-match highlight.

## Quick intent routing (for new chats)

- IPC/channel/schema changes: start in `src/shared/ipc.ts`.
- File-system operations: `electron/services/document-repository.ts` + `electron/ipc/handlers/project-handlers/document-handlers.ts`.
- Sidebar behavior/UI: `src/features/project-editor/components/sidebar/*`.
- Project-editor orchestration/actions: `src/features/project-editor/use-project-editor*.ts`.
- AI import/export feature planning and implementation status: `ai-import-export-implementation-map.md`.
- AI export execution plan (Phase 4 WS5): `ai-export-implementation-plan.md`.
- Regressions after refactor: check `tests/sidebar-panels.test.ts`, `tests/use-project-editor.test.ts`, `tests/ipc-contract.test.ts` first.

## Important note

Some settings were adjusted pragmatically to keep preload integration stable (`sandbox: false`). See `troubleshooting.md` before changing Electron security defaults.
