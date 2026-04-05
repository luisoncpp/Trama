# Current Status (Phase 2 Complete, Phase 3 Progressing)

## Product state

The repository has completed Phase 2 (File System, Indexing, and Core Editing Loop). Core file-first foundations and conflict-safe editing flows are implemented.

Implemented now:
- Electron + Vite + Preact desktop shell.
- Secure-by-default window config with one tradeoff (`sandbox: false`).
- Typed IPC with Zod validation and envelope responses.
- Renderer-to-main debug logging channel (`trama:debug:log`) for diagnostics.
- Native folder picker and project open flow.
- Recursive markdown scan with ignored system/build folders.
- Markdown read/save through main process repository layer.
- YAML frontmatter parse/serialize using `yaml` package.
- `.trama.index.json` reconciliation (prune missing references + append new files).
- External file watcher events and dirty-vs-external conflict prompt.
- Conflict resolution actions: reload, keep local edits, compare disk vs local, and save as copy.
- Refactored renderer feature structure (`project-editor` hook + view/components split).
- Rich markdown visual editor (formatted editing surface, markdown persisted).
- Native right-click context menu with spellcheck suggestions.
- Phase 3 PR-1 completed: sidebar rail shell with persisted section/collapse/width state.
- Phase 3 PR-2 completed: hierarchical sidebar tree with expand/collapse, keyboard navigation basics, and folder/file icons.
- Phase 3 PR-3 completed: debounced sidebar filter/search with scoped matching, auto-expanded branches, and expanded-state restore on clear.
- Phase 3 PR-4 completed: create article/category actions wired end-to-end (renderer actions, typed IPC channels, preload bridge, main-process handlers, and repository create operations).
- Phase 3 PR-5 completed: sidebar hardening with Ctrl/Cmd+F filter focus, improved loading/API-unavailable sidebar states, responsive auto-collapse on narrow viewports, and collapse-all persistence fixes.
- Sidebar IA updated in docs before implementation: sections will map to different project subfolders (`book/`, `outline/`, `lore/`) and Explorer will focus on manuscript Act/Chapter/Scene content.

Not implemented yet (planned in later phases):
- File operations beyond read/save (create/rename/delete workflows).
- Wiki links, templates, corkboard DnD, AI import/export pipeline.
- Move/rename/delete workflows from sidebar context interactions.

## Reliability status

Current verification baseline:
- `npm run build` passes.
- `npm run lint` passes.
- `npm run test` passes.
- `npm run test:smoke` passes.
- Tests cover startup config, IPC contract, frontmatter behavior, index reconciliation, and project-editor conflict/autosave integration behavior.

Additional regression checks currently in the suite:
- Electron smoke startup flow (`tests/electron-smoke.test.ts`).
- TypeScript compilation guard (`tests/typescript-compile.test.ts`).
- Rich markdown editor behavior (`tests/rich-markdown-editor.test.ts`).

## Known technical tradeoffs

- `sandbox: false` remains enabled for preload stability in this setup.
- IPC project handlers still perform some repeated scan/meta refresh work after save (acceptable for current scope, likely optimize later).
- External change handling currently favors safety over convenience (blocks refresh if local document is dirty).

## Suggested next milestones

1. Continue Phase 3 workspace UX:
- Sidebar file operations (rename/move/delete) and context-menu actions.
- Theme preferences and fullscreen/focus mode wiring.

2. Improve editor capabilities:
- Improve rich editor UX polish (layout density, accessibility, keyboard flow).
- Expand markdown fidelity coverage (edge cases in markdown/html roundtrip).

3. Performance and architecture cleanup:
- Reduce repeated full-project scans during save/index updates.
- Add project integration tests for external file event scenarios.
