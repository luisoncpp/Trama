# START HERE - Documentation Entry Point

> **Last updated:** 2026-06-15. If this file drifts from reality, update it before doing anything else.

This file is the required first stop for new conversations.

Goal: avoid repeated codebase-wide searches and reduce drift between implementation and docs.

## Documentation requirements (mandatory)

When a change affects behavior (not only formatting) or when detecting anything in the code that contradicts existing documentation, documentation updates are required in the same task. Read the requirements in `mds/update.md`. **DO NOT SKIP THIS**

## Mandatory reads

@mds/dev-workflow.md
@mds/live/current-status.md
@mds/lessons-learned/README.md
@mds/architecture/README.md
@mds/flows/README.md

## Optional reads

@mds/live/file-map.md for file ownership and where to edit.


## 90-second project summary

Trama is a file-first desktop writing tool (Electron + Preact + TypeScript). The app opens a project folder, scans markdown files, edits with a rich visual editor, saves via typed IPC, reconciles `.trama.index.json`, and handles external file conflicts safely.

**Sidebar** — Section-scoped trees (`book/`, `outline/`, `lore/`), filter, keyboard basics, responsive collapse, split `+ Article` create flow (article default + map option), `+ Category`, rename/delete from right-click.

**Workspace split mode** — Both panes visible, active pane follows editor clicks, draggable center divider, pane headers show document name, split toggle via `Ctrl/Cmd + .` or context menu, per-pane session history via `Alt+Left` / `Alt+Right` plus menu-bar Back/Forward.

**Theme** — Settings exposes `light`, `dark`, `system`; preference persists through root `data-theme` tokens; system mode listens to OS theme changes. Architecture: `mds/architecture/theme-architecture.md`.

**Fullscreen/Focus Mode** — Native fullscreen toggle via `Ctrl/Cmd+Shift+F`; focus mode with `line | sentence | paragraph` scope dimming around caret via `Ctrl/Cmd+Shift+M`; `ESC` deactivates fullscreen, focus mode, or both; state persists in `trama.workspace.layout.v1`; focus Scope selector in sidebar Settings tab; sidebar hidden completely (display:none) during focus, editor grid collapses to single column, scrollbar dimmed.

**UX hardening** — Workspace toolbar removed; all controls in native right-click context menu; event bridge pattern (`trama:workspace-command` CustomEvent); smart typography (`--` → `—`, `<<` → `«`, `>>` → `»`, each Ctrl+Z reversible); Paste from Markdown converts clipboard Markdown to rich editor HTML; In-document Find via `Ctrl/Cmd+F`, Find + Replace via `Ctrl/Cmd+H`; **Recargar proyecto** via `Ctrl/Cmd+R` (intercepted before Electron native reload).

**AI import/export** — Structured clipboard import (`=== FILE: ... ===` format) with preview and `replace`/`append` modes; AI export to clipboard with multi-file selection and include/exclude frontmatter.

## High-value invariants (do not break)

- IPC channel names and schemas live only in `src/shared/ipc.ts`.
- IPC handlers must return envelope responses (`ok/data` or `ok:false/error`).
- Preload API surface in `electron/preload.cts` must match `src/types/trama-api.d.ts`.
- Sidebar imports for `.tsx` components should keep explicit `.tsx` extension.
- Lint limits are strict (`max-lines` and `max-lines-per-function`), so split components/hooks early.
- Workspace commands from the context menu travel via `WORKSPACE_CONTEXT_MENU_EVENT` in `src/shared/workspace-context-menu.ts`; do not bypass this contract.

## Regression hotspots

- Rich editor cursor jumping: watch re-init dependencies in editor core.
- Split-pane dirty badge in wrong pane: verify pane-targeted update path (`updateEditorValue(value, pane)`), and check split-pane wiring before editing state logic.
- Focus mode sentence/line rendering: prefer CSS Highlights API + fallback overlay; do not inject nodes into `.ql-editor`.
- Sidebar collapse-all restoring unexpectedly: expanded-folder state logic.
- Sidebar create/rename/delete wiring: path scoping between section-relative and project-relative paths.
- Empty folder visibility in tree: scanner + tree builder interplay.

## Anti-forget checks (required)

Before finalizing any implementation/doc change:

1. Run `npm run check` (includes `fallow audit`). Fix any complexity/dead-code findings before reporting done.
2. Confirm `mds/live/file-map.md` includes any new TS/TSX files.
3. Confirm relevant notes exist in `mds/lessons-learned/README.md` and add one if needed.
4. Confirm `mds/live/current-status.md` is still accurate for feature status.
