# Trama Technical Docs

This folder documents the active implementation so new chats can resume work quickly without re-reading large parts of the codebase.

## Mandatory first stop

Start in `START-HERE.md` before reading anything else.

`START-HERE.md` is the anti-drift entrypoint and always links to:
- `file-map.md`
- `lessons-learned/README.md`
- feature maps (including AI import/export)

Format/export specification:
- `docs/spec/markdown-layout-directives-spec.md` (invisible layout directives for center, spacer, and pagebreak with EPUB/MOBI mapping)

Coordination architecture:
- `docs/architecture/split-pane-coordination.md` (source-of-truth and action-flow model for dual-pane editor behavior)

Implementation plans:
- `docs/plan/wiki-tag-links-implementation-plan.md` (WS1 execution guide)

System guides:
- `docs/plan/wiki-tag-links-system-guide.md` (WS1 architecture map + fast debug playbook)

## Recommended reading order

1. `START-HERE.md`
2. `new-conversation-handoff.md`
3. `current-status.md`
4. `implementation-overview.md`
5. `ipc-architecture.md`
6. `file-map.md`
8. `dev-workflow.md`
9. `troubleshooting.md`
10. `lessons-learned/README.md`

Archived completed plans:
- `docs/plan/done/README.md`

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
- Understand split-pane coordination model: `docs/architecture/split-pane-coordination.md`.
- Split-pane dirty/unsaved mismatch: `docs/troubleshooting.md` (split pane dirty section) -> `src/features/project-editor/components/workspace-editor-panels.tsx` -> `src/features/project-editor/use-project-editor-ui-actions.ts` -> `tests/project-editor-conflict-flow.test.ts`.
- Wiki Tag Links feature work: `docs/spec/wiki-tag-links-spec.md` + `docs/plan/wiki-tag-links-implementation-plan.md` + `docs/plan/wiki-tag-links-system-guide.md`.
- Regressions after refactor: check `tests/sidebar-panels.test.ts`, `tests/use-project-editor.test.ts`, `tests/ipc-contract.test.ts` first.

## Important note

Some settings were adjusted pragmatically to keep preload integration stable (`sandbox: false`). See `troubleshooting.md` before changing Electron security defaults.
