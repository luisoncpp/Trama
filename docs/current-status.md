# Current Status (Phase 3 Complete + Phase 4 WS5 Partial)

> **New conversation?** Open `docs/START-HERE.md` first — it routes you to the 3-4 files you actually need.

## Product state

The repository has completed Phase 2 and all Phase 3 workstreams (WS1–WS5).

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
- Paste from Markdown: native context-menu option to convert Markdown from clipboard into rich editor content.
- In-document Find: floating search bar inside the editor (`Ctrl/Cmd+F`) with next/previous match navigation and active-match visual highlight.
- Sidebar rail with persisted section/collapse/width state.
- Hierarchical sidebar tree with expand/collapse and keyboard navigation basics.
- Sidebar filter/search with auto-expand and expanded-state restore.
- Sidebar create actions (`+Article`, `+Category`) wired end-to-end via IPC.
- Sidebar hardening: loading/API-unavailable states, responsive auto-collapse, and collapse-all persistence fixes.
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
- Fullscreen/Focus Mode (WS3) complete: native fullscreen via IPC with BrowserWindow event sync, Scrivener-style focus mode with line/sentence/paragraph scope dimming, and keyboard shortcuts (Ctrl/Cmd+Shift+F = fullscreen, Ctrl/Cmd+Shift+M = focus mode). Focus state persisted in `trama.workspace.layout.v1`. Focus mode always starts disabled at launch.
- Workspace toolbar removed; all workspace controls (split, fullscreen, focus) moved to native right-click context menu via event bridge (`src/shared/workspace-context-menu.ts`).
- Focus Scope selector (line/sentence/paragraph) moved to sidebar Settings tab.
- Sidebar auto-collapses when focus mode activates and is locked closed while focus is active.
- Typography auto-replacement in the rich editor: typing `--` inserts `—`, `<<` inserts `«`, `>>` inserts `»`. Each replacement is a discrete Ctrl+Z undo entry.
- `npm run dev` automatically builds the Electron main process before starting the dev server (`build:electron && dev:desktop`).
- AI import (clipboard) implemented end-to-end: parser, preview, import dialog, renderer hook, IPC handlers, and main-process file creation flow.
- AI export implemented end-to-end: sidebar export trigger, multi-file export dialog, include/exclude frontmatter option, secure path validation in backend service, IPC handler coverage, and clipboard copy flow.
- AI export UX polish: export copy flow now shows a success toast notification after clipboard write.
- Wiki tag link stability hardening: tag index now refreshes immediately after document save flows (including frontmatter tag edits), so Ctrl/Cmd+Click navigation works without restarting the app.

Not implemented yet (planned in later phases):
- Folder rename/delete and move workflows.
- Drag-and-drop reorder/move workflows.
- Wiki links, templates, corkboard DnD.

## Reliability status

Current verification baseline:
- `npm run build` passes.
- `npm run lint` passes.
- `npm run test` passes (26 suites, 129 tests).
- `npm run test:smoke` passes.

**Running tests**: In sandboxed agent environments, `npm test` may fail due to environment restrictions. Use the PowerShell script instead, which runs in a full PowerShell context and passes consistently:
- Script: `powershell -ExecutionPolicy Bypass -File scripts/run-tests.ps1`
- VS Code shortcut: `Ctrl+Shift+T` (task: "Run Tests & Report")
- Output: `reports/test-report.txt` (timestamped report + console output)

Additional regression checks in suite include:
- Electron smoke startup flow (`tests/electron-smoke.test.ts`).
- TypeScript compilation guard (`tests/typescript-compile.test.ts`).
- Rich markdown editor behavior (`tests/rich-markdown-editor.test.ts`).
- Paste Markdown behavior (`tests/paste-markdown.test.ts`).
- In-document Find behavior (`tests/rich-markdown-editor.test.ts`).
- Sidebar panel interactions including right-click rename/delete (`tests/sidebar-panels.test.ts`).
- Tag index hot-refresh regression coverage for save -> getTagIndex/tagResolve flows (`tests/tag-index-ipc-regression.test.ts`).

## Known technical tradeoffs

- `sandbox: false` remains enabled for preload stability in this setup.
- Index refresh still does full reconciliation in several write flows (safe, but can be optimized later).
- External change handling favors safety over convenience (prevents accidental overwrite when local doc is dirty).

## ✅ Phase 3 Sign-off

**Status**: All Phase 3 workstreams (WS1–WS5) are complete.

### Completion evidence

| Workstream | Deliverable | Status |
|---|---|---|
| **WS1** - Split Workspace Usability | Dual-pane layout, drag divider, click-to-activate, persistence | ✅ Complete |
| **WS2** - Theme System | Light/dark/system preference, semantic tokens, WCAG AA, matchMedia sync | ✅ Complete |
| **WS3** - Fullscreen & Focus Mode | Native fullscreen IPC, focus mode with scope dimming, keyboard shortcuts | ✅ Complete |
| **WS4** - UX Hardening | Context menu migration, typography auto-replace, responsive sidebar, keyboard shortcuts | ✅ Complete |
| **WS5** - Final Hardening & Docs | Regression pass, docs updated, quality gates passing | ✅ Complete |

### Quality gates

- `npm run build` ✅ passes
- `npm run lint` ✅ passes
- `npm run test` ✅ passes (21 suites, 97 tests)
- `npm run test:smoke` ✅ passes

**Next phase**: Phase 4 — Wiki tag links, folder operations, templates, corkboard, and closing WS5 (AI export UX + tests). See `docs/phase-4-detailed-plan.md` for full plan.

## Phase 4 planned work

See `docs/phase-4-detailed-plan.md` for the complete plan with 5 workstreams:

| Workstream | Description | Key Deliverables | Status |
|---|---|---|---|
| **WS1** | Wiki Tag Links | TagIndexService, implicit tag matching, Ctrl+click navigation | ✅ Complete |
| **WS2** | Folder Operations | Rename, delete, move with conflict safety | Pending |
| **WS3** | Templates | Create from schema, placeholder system, default templates | Pending |
| **WS4** | Corkboard | Drag-and-drop card view, persistence | Pending |
| **WS5** | AI Import/Export | Import/export implemented end-to-end, including export hardening and regression tests | ✅ Complete |
