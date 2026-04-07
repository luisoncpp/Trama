# Trama Technical Docs

This folder documents the active implementation so new chats can resume work quickly without re-reading large parts of the codebase.

## Recommended reading order

1. `new-conversation-handoff.md`
2. `current-status.md`
3. `implementation-overview.md`
4. `ipc-architecture.md`
5. `file-map.md`
6. `dev-workflow.md`
7. `troubleshooting.md`
8. `lessons-learned/README.md`

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

## Quick intent routing (for new chats)

- IPC/channel/schema changes: start in `src/shared/ipc.ts`.
- File-system operations: `electron/services/document-repository.ts` + `electron/ipc/handlers/project-handlers/document-handlers.ts`.
- Sidebar behavior/UI: `src/features/project-editor/components/sidebar/*`.
- Project-editor orchestration/actions: `src/features/project-editor/use-project-editor*.ts`.
- Regressions after refactor: check `tests/sidebar-panels.test.ts`, `tests/use-project-editor.test.ts`, `tests/ipc-contract.test.ts` first.

## Important note

Some settings were adjusted pragmatically to keep preload integration stable (`sandbox: false`). See `troubleshooting.md` before changing Electron security defaults.
