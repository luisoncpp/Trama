# Trama Technical Docs

This folder documents the current Phase 2 implementation so future sessions can resume work without relying on chat history.

## Recommended reading order

1. `new-conversation-handoff.md`
2. `current-status.md`
3. `implementation-overview.md`
4. `ipc-architecture.md`
5. `file-map.md`
6. `dev-workflow.md`
7. `troubleshooting.md`
8. `phase-2-closure-checklist.md`

## Current scope

The project currently implements **Phase 1 baseline + complete Phase 2 scope**:

- Electron + Vite + Preact desktop shell
- Secure-by-default Electron window configuration (with one practical preload tradeoff, documented below)
- Typed IPC contract with runtime validation
- `contextBridge` preload API (`window.tramaApi`)
- Renderer-to-main debug logging endpoint (`trama:debug:log`)
- Native folder picker (`selectProjectFolder`)
- Project scan + markdown read/save + index reconciliation
- External file watcher and dirty-vs-external conflict prompt
- Frontmatter parsing/serialization backed by a dedicated YAML library
- Rich markdown visual editor (formatted text UI, markdown persisted)
- Native right-click context menu with spellcheck suggestions
- Refactored renderer structure (`useProjectEditor` + split presentational components)
- Tests for startup/smoke, IPC contract, frontmatter, index reconciliation, project-editor logic/hooks, rich markdown editor behavior, and TypeScript compile guard

## Important note

Some settings were adjusted pragmatically to make preload integration reliable on this setup. See `troubleshooting.md` for why and when to revisit them.
