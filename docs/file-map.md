# File Map and Responsibilities

Note for agents: each time you are asked to update the documentation, if you found a ts or tsx file not specified here, you have to add it.

## Root-level project files

- `package.json`
  - Scripts for dev/build/test/smoke.
  - Electron entry configured via `main`.
- `vite.config.ts`
  - Preact plugin and Vitest config.
- `postcss.config.js`
  - Tailwind PostCSS plugin.
- `tsconfig.electron.json`
  - Compiles main/preload/shared contracts to `dist-electron`.

## Electron layer

- `electron/main.ts`
  - App lifecycle and BrowserWindow creation.
  - Wires smoke hooks and editor context-menu helpers.
  - Emits native fullscreen state changes to renderer.
  - Registers IPC handlers.
- `electron/window-config.ts`
  - BrowserWindow security-related defaults.
- `electron/main-process/context-menu.ts`
  - Native editor context menu: flat workspace commands (toggle split, toggle fullscreen, toggle focus mode) dispatched to renderer via `WORKSPACE_CONTEXT_MENU_EVENT`.
  - Includes the `Paste Markdown` menu entry for editable contexts; the menu dispatches `{ type: 'paste-markdown' }` to the renderer when selected.
- `electron/main-process/smoke-hooks.ts`
  - Startup smoke hooks.
- `electron/ipc.ts`
  - Thin IPC registration/orchestration.
- `electron/ipc-runtime.ts`
  - Active project/index runtime state + watcher lifecycle.
- `electron/ipc-errors.ts`
  - Shared IPC error envelope helper.
- `electron/preload.cts`
  - Typed `window.tramaApi` bridge.
  - Includes fullscreen command and fullscreen-change subscription bridge.

### IPC handlers

- `electron/ipc/handlers/ping-handler.ts`
  - Ping endpoint.
- `electron/ipc/handlers/project-handlers/project-open-handler.ts`
  - Open project + scan + reconcile + watcher start.
- `electron/ipc/handlers/project-handlers/project-folder-dialog-handler.ts`
  - Native folder picker endpoint.
- `electron/ipc/handlers/project-handlers/document-handlers.ts`
  - Read/save/create/rename/delete document + create folder handlers.
- `electron/ipc/handlers/project-handlers/index-handler.ts`
  - Get index handler.

### Services

- `electron/services/project-scanner.ts`
  - Recursive markdown scan + tree data (including empty folders).
- `electron/services/document-repository.ts`
  - Read/save/create/rename/delete markdown files.
- `electron/services/frontmatter.ts`
  - YAML frontmatter parse/serialize.
- `electron/services/index-service.ts`
  - `.trama.index.json` load/save/reconcile.
- `electron/services/watcher-service.ts`
  - Chokidar wrapper + internal/external write classification.

## Renderer layer

- `src/app.tsx`
  - Top-level app composition.
- `src/features/project-editor/use-project-editor.ts`
  - Main feature hook (state + effects + action integration).
- `src/features/project-editor/project-editor-view.tsx`
  - Screen-level composition (sidebar + editor + status).
- `src/features/project-editor/use-project-editor-ui-actions.ts`
  - Composes UI actions.
- `src/features/project-editor/use-project-editor-focus-actions.ts`
  - Fullscreen/focus-mode action hooks. When enabling focus, auto-collapses the sidebar.
- `src/features/project-editor/use-project-editor-file-actions.ts`
  - Rename/delete file actions.
- `src/features/project-editor/use-project-editor-create-actions.ts`
  - Create article/category actions.
- `src/features/project-editor/use-project-editor-sidebar-actions.ts`
  - Sidebar UI actions. Blocks sidebar expand while focus mode is active.
- `src/features/project-editor/use-project-editor-layout-actions.ts`
  - Workspace split and pane activation actions.
- `src/features/project-editor/use-project-editor-open-project.ts`
  - Open-project flow and pane/layout reconciliation.
- `src/features/project-editor/use-project-editor-fullscreen-effect.ts`
  - Renderer subscription to native fullscreen state changes.
- `src/features/project-editor/use-project-editor-shortcuts-effect.ts`
  - Global workspace shortcuts (split/fullscreen/focus/pane switch).
- `src/features/project-editor/use-workspace-layout-state.ts`
  - Persist workspace layout (`trama.workspace.layout.v1`).
- `src/features/project-editor/use-sidebar-ui-state.ts`
  - Persist sidebar UI (`trama.sidebar.ui.v1`).

### Project editor hooks (detailed)

- `src/features/project-editor/use-project-editor-state.ts`
  - Core local state for the editor feature (panes, loading/saving flags, conflict state, status messages).
- `src/features/project-editor/use-project-editor-actions.ts`
  - Composes UI actions and core operations (load/save/open/clear) and wires them into the state.
- `src/features/project-editor/use-project-editor-autosave-effect.ts`
  - Debounced autosave effect that persists edits after a short idle period.
- `src/features/project-editor/use-project-editor-external-events-effect.ts`
  - Subscribes to external file events (watcher) and handles reloads/conflicts/tree refresh.
- `src/features/project-editor/use-project-editor-context-menu-effect.ts`
  - Handles workspace-level context menu commands (split/fullscreen/focus/split ratio).
- `src/features/project-editor/use-project-editor-fullscreen-effect.ts`
  - Listens for native fullscreen changes and mirrors them into UI state.
- `src/features/project-editor/use-project-editor-shortcuts-effect.ts`
  - Global keyboard shortcuts handling for editor workspace actions.
- `src/features/project-editor/use-project-editor-open-project.ts`
  - Orchestrates opening a project: load snapshot, reconcile layout, preload inactive pane.
- `src/features/project-editor/use-project-editor-ui-actions.ts`
  - High-level UI action builders used by components (pick folder, select file, save, create, rename, delete, focus/fullscreen toggles).
- `src/features/project-editor/use-project-editor-create-actions.ts`
  - Helpers to create new articles and category folders in the project.
- `src/features/project-editor/use-project-editor-file-actions.ts`
  - File operations (rename, delete) with status updates and project reopen flows.
- `src/features/project-editor/use-project-editor-conflict-actions.ts`
  - Actions to resolve external edit conflicts (reload, keep, save-as-copy, compare).
- `src/features/project-editor/use-project-editor-layout-actions.ts`
  - Workspace layout actions (assign file to pane, toggle split, set ratio, switch active pane).
- `src/features/project-editor/use-project-editor-focus-actions.ts`
  - Focus-mode controls (enable/disable, set scope: line/sentence/paragraph). Auto-collapses sidebar on focus enable.

### Editor workspace components

- `src/features/project-editor/components/workspace-editor-panels.tsx`
  - Single/split editor rendering and pane interactions.
- `src/features/project-editor/components/editor-panel.tsx`
  - Editor panel shell, sync labels, save affordance.
- `src/features/project-editor/components/rich-markdown-editor.tsx`
  - Quill-based rich Markdown editor component (lifecycle, toolbar integration, focus-mode hookup).
- `src/features/project-editor/components/rich-markdown-editor-core.ts`
  - Core editor lifecycle and sync logic (initialize Quill, apply markdown, sync external values, enable/disable, register typography handlers).
  - Also listens for workspace `paste-markdown` commands and handles reading/parsing clipboard Markdown and inserting HTML into Quill.
- `src/features/project-editor/components/rich-markdown-editor-find.tsx`
  - In-document find hook: Ctrl/Cmd+F activation, query/match state, and integration between floating UI and editor selection.
- `src/features/project-editor/components/rich-markdown-editor-find-overlay.tsx`
  - Floating find bar UI (input, counter, prev/next, close) plus active-match overlay rendering.
- `src/features/project-editor/components/rich-markdown-editor-find-visual.ts`
  - Active-match visual sync helpers: computes Quill bounds and keeps highlighted match visible while preserving input focus.
  - Includes focus-mode-aware centering via `handleFocusModeMatch()`.
- `src/features/project-editor/components/rich-markdown-editor-typography.ts`
  - Smart typography auto-replacement on user input: `--` → `—`, `<<` → `«`, `>>` → `»`. Each substitution is isolated as its own Ctrl+Z undo entry via `history.cutoff()`.
- `src/features/project-editor/components/rich-markdown-editor-focus-scope.ts`
  - Focus-mode hook orchestration: applies emphasis classes and wires scroll centering, selection tracking, and listener setup.
  - Coordinates between focus scope helpers and centered scroll updates.
- `src/features/project-editor/components/rich-markdown-editor-focus-scope-helpers.ts`
  - Focus scope helper functions: applies/clears CSS class emphasis, manages CSS Highlights API, handles fallback text emphasis.
  - Contains `getSelectionViewportRect()` for real DOM viewport geometry of the current selection.
- `src/features/project-editor/components/rich-markdown-editor-focus-scope-scroll.ts`
  - Centered scroll logic: computes target scroll position to keep active line centered vertically.
  - Uses requestAnimationFrame phases to recalculate after padding changes; expands top/bottom edge space dynamically.
- `src/features/project-editor/components/rich-markdown-editor-focus-scope-geometry.ts`
  - Geometry helpers for focus-mode (text offset resolution, visual line/sentence boundary calculations).
- `src/features/project-editor/components/rich-markdown-editor-toolbar.ts`
  - Injects and synchronizes toolbar controls (save button, sync indicator) into the Quill toolbar.

### Sidebar components

- `src/features/project-editor/components/sidebar/sidebar-panel.tsx`
  - Sidebar shell/orchestrator.
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx`
  - Active section body composition.
- `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts`
  - Section scoping + filter-state helpers.
- `src/features/project-editor/components/sidebar/sidebar-rail.tsx`
  - Section rail and collapse toggle.
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
  - Explorer container and dialog orchestration.
- `src/features/project-editor/components/sidebar/sidebar-explorer-body.tsx`
  - Explorer body (path, filter, tree, state hints, menus/dialogs).
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx`
  - Interactive tree rows, keyboard nav, right-click file hook.
- `src/features/project-editor/components/sidebar/sidebar-tree-logic.ts`
  - Pure tree build/flatten helpers.
- `src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders.ts`
  - Expanded folder state management.
- `src/features/project-editor/components/sidebar/sidebar-filter.tsx`
  - Filter input UI.
- `src/features/project-editor/components/sidebar/use-sidebar-filter-shortcut.ts`
  - Legacy sidebar filter shortcut helper (Ctrl/Cmd+F), currently not wired after in-document find shortcut reassignment.
- `src/features/project-editor/components/sidebar/use-sidebar-responsive-collapse.ts`
  - Auto-collapse on narrow viewport.
- `src/features/project-editor/components/sidebar/sidebar-create-dialog.tsx`
  - Create modal dialog.
- `src/features/project-editor/components/sidebar/use-sidebar-create-dialog.ts`
  - Create modal state logic.
- `src/features/project-editor/components/sidebar/sidebar-file-context-menu.tsx`
  - Right-click file action menu.
- `src/features/project-editor/components/sidebar/use-sidebar-file-context-menu.ts`
  - Context menu state/handlers.
- `src/features/project-editor/components/sidebar/sidebar-file-actions-dialog.tsx`
  - Rename/delete confirmation/input dialog.
- `src/features/project-editor/components/sidebar/use-sidebar-file-actions-dialog.ts`
  - Rename/delete dialog state.
- `src/features/project-editor/components/sidebar/sidebar-footer-actions.tsx`
  - Create buttons (`+Article`, `+Category`).
- `src/features/project-editor/components/sidebar/sidebar-settings-content.tsx`
  - Sidebar settings panel (width slider).

## Shared contracts

- `src/shared/ipc.ts`
  - IPC channel constants, Zod schemas, shared envelope/types.
- `src/shared/workspace-context-menu.ts`
  - Event bridge contract between Electron context menu and the renderer: `WORKSPACE_CONTEXT_MENU_EVENT` constant and `WorkspaceContextCommand` union type.
  - The `WorkspaceContextCommand` includes the `{ type: 'paste-markdown' }` case used by the native menu and editor listeners.
- `src/types/trama-api.d.ts`
  - Global declaration for `window.tramaApi`.

## Tests

Core and regression suites:

- `tests/ipc-contract.test.ts`
- `tests/fullscreen-ipc.test.ts`
- `tests/use-project-editor.test.ts`
- `tests/workspace-layout-persistence.test.ts`
- `tests/project-editor-conflict-flow.test.ts`
- `tests/project-editor-logic.test.ts`
- `tests/rich-markdown-editor.test.ts`
- `tests/paste-markdown.test.ts`
- `tests/focus-mode-scope.test.ts`
- `tests/sidebar-tree.test.ts`
- `tests/sidebar-filter.test.ts`
- `tests/sidebar-panels.test.ts`
- `tests/sidebar-scroll-regression.test.ts`
- `tests/workspace-keyboard-shortcuts.test.ts`
- `tests/frontmatter-parser.test.ts`
- `tests/index-reconciliation.test.ts`
- `tests/theme-preference.test.ts`
- `tests/startup-smoke.test.ts`
- `tests/electron-smoke.test.ts`
- `tests/typescript-compile.test.ts`

## Build outputs

- `dist/` -> renderer build.
- `dist-electron/` -> transpiled Electron and shared runtime files.
- Required preload artifact: `dist-electron/electron/preload.cjs`.
