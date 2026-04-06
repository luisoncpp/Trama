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
- Workspace split-layout foundation: single/split mode toggle, ratio control, active pane switching, pane document assignment, and local persistence (`trama.workspace.layout.v1`).
- Layout reconciliation hardening: preferred-document restores now respect active pane intent during project reopen flows.
- Per-pane editor state model: independent `primaryPane`/`secondaryPane` document content, metadata, and dirty flags.
- Pane-targeted document loading and save dirty-flag clearing by matching path.
- Split reopen flow hardened through dedicated open-project module (`use-project-editor-open-project.ts`) to satisfy lint limits and reduce hook complexity.
- Split conflict regression restored: save-as-copy from secondary pane remains in secondary after project reopen.
- Split workspace usability pass completed: both panes stay visible, pane activation is click-in-editor, resize uses a center drag divider, headers show document names, split toggle is available through `Ctrl/Cmd + .` and the editor context menu, and split mode removes extra side gutters.
- Theme system foundation landed: persisted `light | dark | system` preference, root `data-theme` application, live `matchMedia` sync for `system`, settings-panel theme switcher, and first-pass semantic tokens across sidebar, editor, split panes, and conflict UI.
- Theme visual polish completed: all 5 light-mode colors audited and updated for WCAG AA contrast compliance (4.5:1 for text, 3:1 for UI components).
- Theme visual polish completed: all 5 light-mode colors audited and updated for WCAG AA contrast compliance (4.5:1 for text, 3:1 for UI components).
- Fullscreen/Focus Mode (WS3) complete: native fullscreen via IPC with BrowserWindow event sync, Scrivener-style focus mode with line/sentence/paragraph scope dimming, keyboard shortcuts (Ctrl/Cmd+Shift+F = fullscreen, Ctrl/Cmd+Shift+M = focus mode), and WorkspaceLayoutControls toolbar component. Focus state persisted in `trama.workspace.layout.v1`.

Not implemented yet (planned in later phases):
- Folder rename/delete and move workflows.
- Drag-and-drop reorder/move workflows.
- Wiki links, templates, corkboard DnD, AI import/export pipeline.
- Fullscreen/focus mode (WS3).
- ~~Fullscreen/focus mode (WS3).~~ ✓ Completed.

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

## 🎯 Next Immediate Step: Phase 3 Workstream 3 - Fullscreen & Focus Mode

**Status**: Ready to start (WS2 closed)

WS1 and WS2 are complete. The active focus now moves to WS3:

1. Add fullscreen IPC contract and main/renderer wiring.
2. Mirror native fullscreen changes back into renderer state.
3. Add focus mode controls to reduce workspace chrome without data loss.
4. Extend tests for fullscreen contract and smoke coverage.

**📖 Detailed plan**: See [phase-3-detailed-plan.md](./phase-3-detailed-plan.md) (WS3 section).

Planned sequence from here: WS3 (Fullscreen & Focus Mode) → WS4 (UX Hardening & Accessibility) → WS5 (Final Hardening & Docs)

## Other planned improvements (Phase 4+)

- Complete file-tree operations (folder rename/delete, move workflows)
- Editor accessibility and keyboard flow
- Performance optimization (reduce full-project scans)
- Wiki links, templates, corkboard UX
- AI import/export pipeline
