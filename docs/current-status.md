# Current Status (Phase 3 Core Complete)

## Product state

The repository has completed Phase 2 and the core Phase 3 sidebar scope.

Implemented now:
- Electron + Vite + Preact desktop shell.
- Secure-by-default window config with one tradeoff (`sandbox: false`).
- Typed IPC with Zod validation and envelope responses.
- Renderer-to-main debug logging channel (`trama:debug:log`) for diagnostics.
- Native folder picker and project open flow.
- Recursive markdown scan with ignored system/build folders.
- Markdown read/save through main-process repository layer.
- YAML frontmatter parse/serialize using `yaml` package.
- `.trama.index.json` reconciliation (prune missing references + append new files).
- External file watcher events and dirty-vs-external conflict prompt.
- Conflict resolution actions: reload, keep local edits, compare disk vs local, and save as copy.
- Refactored renderer feature structure (`project-editor` hook + view/components split).
- Rich markdown visual editor (formatted editing surface, markdown persisted).
- Native right-click editor context menu with spellcheck suggestions.
- Sidebar rail with persisted section/collapse/width state.
- Hierarchical sidebar tree with expand/collapse and keyboard navigation basics.
- Sidebar filter/search with auto-expand and expanded-state restore.
- Sidebar create actions (`+Article`, `+Category`) wired end-to-end via IPC.
- Sidebar hardening: Ctrl/Cmd+F filter focus, loading/API-unavailable states, responsive auto-collapse, and collapse-all persistence fixes.
- Sidebar file actions (`Rename`, `Delete`) via right-click file context menu.
- Main-process file operations expanded to create/rename/delete markdown files plus folder create.

Not implemented yet (planned in later phases):
- Folder rename/delete and move workflows.
- Drag-and-drop reorder/move workflows.
- Wiki links, templates, corkboard DnD, AI import/export pipeline.
- Theme preferences and fullscreen/focus mode.

## Reliability status

Current verification baseline:
- `npm run build` passes.
- `npm run lint` passes.
- `npm run test` passes.
- `npm run test:smoke` passes.

Additional regression checks in suite include:
- Electron smoke startup flow (`tests/electron-smoke.test.ts`).
- TypeScript compilation guard (`tests/typescript-compile.test.ts`).
- Rich markdown editor behavior (`tests/rich-markdown-editor.test.ts`).
- Sidebar panel interactions including right-click rename/delete (`tests/sidebar-panels.test.ts`).

## Known technical tradeoffs

- `sandbox: false` remains enabled for preload stability in this setup.
- Index refresh still does full reconciliation in several write flows (safe, but can be optimized later).
- External change handling favors safety over convenience (prevents accidental overwrite when local doc is dirty).

## Suggested next milestones

1. Complete file-tree operations:
- Folder rename/delete.
- Move file/folder between branches.

2. Editor and UX polish:
- Accessibility and keyboard flow improvements around dialogs/menus.
- Markdown fidelity edge-case expansion.

3. Performance and architecture cleanup:
- Reduce repeated full-project scans/index reconciliations.
- Add integration coverage for watcher bursts and concurrent edits.
