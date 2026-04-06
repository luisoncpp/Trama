# New Conversation Handoff

## Goal

Bootstrap a fresh chat in minutes and avoid spending tokens rediscovering architecture.

## 90-second summary

Trama is a file-first desktop writing tool (Electron + Preact + TypeScript). The app opens a project folder, scans markdown files, edits with a rich visual editor, saves via typed IPC, reconciles `.trama.index.json`, and handles external file conflicts safely.

Sidebar scope is mature for core operations:
- Section-scoped trees (`book/`, `outline/`, `lore/`), filter, keyboard basics, responsive collapse.
- Create article/category from sidebar.
- Rename/delete markdown files from right-click context menu.

Workspace split mode is now usable for daily work:
- Both panes remain visible in split mode.
- Active pane follows clicks inside the editor surface.
- Resize uses a draggable center divider.
- Pane headers show the current document and split toggle is exposed via `Ctrl/Cmd + .` plus the editor context menu.

Theme groundwork is now live:
- Settings exposes `light`, `dark`, and `system`.
- Theme preference persists and applies through root `data-theme` tokens.
- System mode listens to OS theme changes.
WS3 Fullscreen/Focus Mode is now live:
- Native fullscreen toggle via `Ctrl/Cmd+Shift+F` and WorkspaceLayoutControls toolbar.
- Renderer state mirrors native events (enter-full-screen / leave-full-screen).
- Scrivener-style focus mode: `line | sentence | paragraph` scope dimming around caret.
- Focus mode toggle via `Ctrl/Cmd+Shift+M`; state persists in `trama.workspace.layout.v1`.

Theme groundwork is now live:
## Read first (in order)

1. `docs/current-status.md`
2. `docs/implementation-overview.md`
3. `docs/ipc-architecture.md`
4. `docs/file-map.md`
5. `docs/dev-workflow.md`
6. `docs/troubleshooting.md`
7. `docs/lessons-learned/README.md`

## Fast intent routing (what to open for each task)

- Add/change IPC endpoint:
  - `src/shared/ipc.ts`
  - `electron/ipc.ts`
  - `electron/ipc/handlers/project-handlers/*`
  - `electron/preload.cts`
  - `src/types/trama-api.d.ts`

- Change file-system behavior (read/save/create/rename/delete):
  - `electron/services/document-repository.ts`
  - `electron/ipc/handlers/project-handlers/document-handlers.ts`

- Change sidebar UX/behavior:
  - `src/features/project-editor/components/sidebar/sidebar-panel.tsx`
  - `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
  - `src/features/project-editor/components/sidebar/sidebar-explorer-body.tsx`
  - `src/features/project-editor/components/sidebar/sidebar-tree.tsx`
  - `src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders.ts`

- Change action orchestration/state:
  - `src/features/project-editor/use-project-editor.ts`
  - `src/features/project-editor/use-project-editor-ui-actions.ts`
  - `src/features/project-editor/use-project-editor-file-actions.ts`
  - `src/features/project-editor/use-project-editor-create-actions.ts`

## High-value invariants (do not break)

- IPC channel names and schemas live only in `src/shared/ipc.ts`.
- IPC handlers must return envelope responses (`ok/data` or `ok:false/error`).
- Preload API surface in `electron/preload.cts` must match `src/types/trama-api.d.ts`.
- Sidebar imports for `.tsx` components should keep explicit `.tsx` extension.
- Lint limits are strict (`max-lines` and `max-lines-per-function`), so split components/hooks early.

## Regression hotspots

- Rich editor cursor jumping: watch re-init dependencies in editor core.
- Focus scope rendering: treat `.ql-editor` as Quill-owned DOM; avoid structural DOM mutations for highlight effects and keep text-highlight-first + fallback strategy (see `docs/lessons-learned/focus-mode-rich-markdown-highlighting.md`).
- Sidebar collapse-all restoring unexpectedly: expanded-folder state logic.
- Sidebar create/rename/delete wiring: path scoping between section-relative and project-relative paths.
- Empty folder visibility in tree: scanner + tree builder interplay.

## Quick sanity checks after meaningful changes

1. `npm run lint`
2. `npm run test`
3. `npm run build`
4. `npm run test:smoke` (when touching Electron/preload/window/IPC startup)
5. `npm run dev` manual check:
- open folder
- edit/save markdown
- right-click sidebar file -> rename/delete flow
- right-click editor misspelled word -> spellcheck suggestions

## Current high-value next tasks

1. Start WS4 UX hardening and accessibility pass.
2. Ensure keyboard shortcuts for all workspace actions are reachable (split toggle, pane focus switch, fullscreen/focus toggle already done).
3. Add empty states and disabled-state handling for split mode with no secondary file.
4. Responsiveness rules for narrow widths (auto-fallback to single pane).
5. Keep folder rename/delete and move workflows for a later scope.
