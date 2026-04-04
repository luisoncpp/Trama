# File Map and Responsibilities

## Root-level project files

- `package.json`
  - Scripts for dev/build/test.
  - Electron entry configured via `main`.
- `vite.config.ts`
  - Preact plugin and Vitest config.
- `postcss.config.js`
  - Tailwind PostCSS plugin.
- `tsconfig.electron.json`
  - Compiles main/preload/shared contracts to `dist-electron`.

## Electron layer

- `electron/main.ts`
  - App lifecycle (`app.whenReady`, `window-all-closed`).
  - Creates BrowserWindow with preload.
  - Wires smoke hooks and right-click context menu helpers.
  - Registers IPC handlers.
  - Keeps global window reference to prevent early process exit.
- `electron/main-process/context-menu.ts`
  - Builds and shows native context menu.
  - Includes spellcheck suggestions and add-to-dictionary action.
- `electron/main-process/smoke-hooks.ts`
  - Registers smoke-test load-failure and timeout hooks.
- `electron/window-config.ts`
  - BrowserWindow security-related defaults.
  - Enables spellcheck in web preferences.
- `electron/ipc.ts`
  - Thin orchestration layer for channel registration.
  - Hosts renderer debug-log bridge (`trama:debug:log`) after payload validation.
  - Delegates real logic to modular handlers.
- `electron/ipc/handlers/index.ts`
  - Facade export for all IPC handler entry points.
- `electron/ipc/handlers/ping-handler.ts`
  - Ping validation + envelope response.
- `electron/ipc/handlers/project-handlers/project-open-handler.ts`
  - `openProject` validation + scan + index reconciliation + watcher startup.
- `electron/ipc/handlers/project-handlers/project-folder-dialog-handler.ts`
  - Native folder picker dialog handler.
- `electron/ipc/handlers/project-handlers/document-handlers.ts`
  - `readDocument` and `saveDocument` handlers.
- `electron/ipc/handlers/project-handlers/index-handler.ts`
  - `getIndex` handler.
- `electron/ipc-runtime.ts`
  - Active project/index runtime state and watcher lifecycle.
- `electron/ipc-errors.ts`
  - Shared IPC error envelope helper.
- `electron/preload.cts`
  - Exposes typed `window.tramaApi` with `contextBridge`.
  - Bridges external-file event subscription.
- `electron/services/project-scanner.ts`
  - Recursive markdown project scan with ignored paths.
- `electron/services/document-repository.ts`
  - Read/save markdown documents with frontmatter support.
- `electron/services/frontmatter.ts`
  - YAML frontmatter parse/serialize.
- `electron/services/index-service.ts`
  - `.trama.index.json` load/save/reconcile.
- `electron/services/watcher-service.ts`
  - Chokidar wrapper and `internal|external` change classification.

## Renderer layer

- `src/app.tsx`
  - Minimal app composition entry.
- `src/features/project-editor/use-project-editor.ts`
  - Main hook for Phase 2 editor state/actions.
- `src/features/project-editor/use-project-editor-autosave-effect.ts`
  - Autosave side-effect extraction.
- `src/features/project-editor/use-project-editor-external-events-effect.ts`
  - External-file event side-effect extraction.
- `src/features/project-editor/project-editor-view.tsx`
  - Screen-level UI composition.
- `src/features/project-editor/components/*`
  - Presentational components (header, conflict banner, editor panel).
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx`
  - Sidebar shell/orchestrator.
  - Composes rail + active section panel.
- `src/features/project-editor/components/sidebar/sidebar-rail.tsx`
  - Left rail with section selection and collapse toggle.
  - Sections: explorer, corkboard, planner, settings.
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
  - Explorer section container/header.
  - Renders root path and hierarchical file tree.
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx`
  - Interactive tree UI.
  - Expand/collapse, selection, and keyboard navigation.
- `src/features/project-editor/components/sidebar/sidebar-tree-logic.ts`
  - Pure tree construction/flattening helpers used by sidebar tree UI.
- `src/features/project-editor/components/sidebar/sidebar-tree-icons.tsx`
  - Sidebar tree chevron + folder/file SVG icons.
- `src/features/project-editor/components/sidebar/sidebar-settings-content.tsx`
  - Sidebar settings section.
  - Panel width slider UI.
- `src/features/project-editor/components/sidebar/sidebar-section-placeholder.tsx`
  - Placeholder section body for corkboard/planner until implemented.
- `src/features/project-editor/use-sidebar-ui-state.ts`
  - Sidebar UI local persistence (`trama.sidebar.ui.v1`).
- `src/features/project-editor/use-project-editor-sidebar-actions.ts`
  - Sidebar-specific action composition layer.
- `src/features/project-editor/project-editor-strings.ts`
  - UI/status string constants.
- `src/features/project-editor/project-editor-logic.ts`
  - Pure helper logic used by hook.
- `src/index.css`
  - Tailwind import + minimal global styles.
- `src/types/trama-api.d.ts`
  - Global TypeScript declaration for `window.tramaApi`.

## Shared contracts

- `src/shared/ipc.ts`
  - Channel constants.
  - Zod schemas for request/response/error.
  - Shared TypeScript envelope types.

## Tests

- `tests/startup-smoke.test.ts`
  - Verifies secure window config values.
- `tests/ipc-contract.test.ts`
  - Valid payload => success envelope.
  - Invalid payload => validation error envelope.
- `tests/frontmatter-parser.test.ts`
  - Frontmatter parser/serializer behavior.
- `tests/index-reconciliation.test.ts`
  - `.trama.index.json` reconciliation behavior.
- `tests/project-editor-logic.test.ts`
  - Pure project-editor helper logic.
- `tests/use-project-editor.test.ts`
  - Hook-level behavior smoke tests.
- `tests/project-editor-conflict-flow.test.ts`
  - Conflict flow behavior under external-change scenarios.
- `tests/rich-markdown-editor.test.ts`
  - Rich markdown editor behavior and conversion loop checks.
- `tests/sidebar-tree.test.ts`
  - Tree building, sorting, flattening, and ancestor-path helpers.
- `tests/sidebar-panels.test.ts`
  - Sidebar shell section rendering + explorer/settings panel interactions.
- `tests/electron-smoke.test.ts`
  - Built app smoke validation for Electron startup + preload API path.
- `tests/typescript-compile.test.ts`
  - Verifies TypeScript project references compile successfully.

## Build outputs

- `dist/`
  - Vite renderer build.
- `dist-electron/`
  - Transpiled Electron and shared runtime files.
  - Expected preload artifact: `dist-electron/electron/preload.cjs`.
