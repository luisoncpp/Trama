# New Conversation Handoff

## Mandatory doc bootstrap (do this first)

Before code exploration, open these docs in order:
1. `docs/START-HERE.md`
2. `docs/file-map.md`
3. `docs/lessons-learned/README.md`

If the task is about AI import/export, also open:
- `docs/markdown-layout-directives-spec.md`

If task is about Wiki Tag Links (WS1), also open:
- `docs/wiki-tag-links-spec.md`
- `docs/wiki-tag-links-implementation-plan.md`

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
- Native fullscreen toggle via `Ctrl/Cmd+Shift+F`.
- Renderer state mirrors native events (enter-full-screen / leave-full-screen).
- Focus mode: `line | sentence | paragraph` scope dimming around caret.
- Focus mode toggle via `Ctrl/Cmd+Shift+M`; state persists in `trama.workspace.layout.v1`. Always starts disabled.
- Focus Scope selector is in the sidebar Settings tab (not in menu/toolbar).
- Sidebar auto-collapses when focus activates and cannot be reopened until focus is off.

UX hardening (WS4) is now live:
- Workspace toolbar removed. Split/fullscreen/focus controls are in the native right-click context menu only.
- Event bridge pattern: Electron dispatches `trama:workspace-command` CustomEvent; renderer hook routes to actions.
- Smart typography: `--` → `—`, `<<` → `«`, `>>` → `»` on user input, each reversible with Ctrl+Z.
- Paste from Markdown: native context-menu entry ("Paste Markdown") converts clipboard Markdown to rich editor HTML; the renderer listens to `trama:workspace-command` and inserts parsed HTML (see `tests/paste-markdown.test.ts`).
- In-document Find: Ctrl/Cmd+F opens a floating search bar inside the editor with result counter, next/previous navigation, and active-match highlight while keeping focus in the find input.
- `npm run dev` auto-builds Electron main before starting the dev server.
## Read first (in order)

1. `docs/START-HERE.md`
2. `docs/current-status.md`
3. `docs/implementation-overview.md`
4. `docs/ipc-architecture.md`
5. `docs/file-map.md`
7. `docs/dev-workflow.md`
8. `docs/troubleshooting.md`
9. `docs/lessons-learned/README.md`

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
- Workspace commands from the context menu travel via `WORKSPACE_CONTEXT_MENU_EVENT` in `src/shared/workspace-context-menu.ts`; do not bypass this contract.

## Regression hotspots

- Rich editor cursor jumping: watch re-init dependencies in editor core.
- Focus mode sentence/line rendering: prefer CSS Highlights API + fallback overlay; do not inject nodes into `.ql-editor`.
- Sidebar collapse-all restoring unexpectedly: expanded-folder state logic.
- Sidebar create/rename/delete wiring: path scoping between section-relative and project-relative paths.
- Empty folder visibility in tree: scanner + tree builder interplay.

## Focus mode notes (important)

- The stable fix is hybrid rendering:
  - Primary: `::highlight(trama-focus-scope)` (true text-level emphasis).
  - Fallback: geometric overlay only when Highlights API is unavailable.
- Keep `paragraph` logic separate from inline scopes (`line`, `sentence`).
- Do not move focus rendering internals back into `rich-markdown-editor.tsx`; keep them in dedicated hook/helpers to preserve lint compliance and maintainability.

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

1. Start WS1 Wiki Tag Links using `docs/wiki-tag-links-implementation-plan.md`.
2. Keep WS2 folder rename/delete/move workflows queued next.
