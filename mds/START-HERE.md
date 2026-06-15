# START HERE - Documentation Entry Point

> **Last updated:** 2026-06-04. If this file drifts from reality, update it before doing anything else.

This file is the required first stop for new conversations.

Goal: avoid repeated codebase-wide searches and reduce drift between implementation and docs.

## Documentation requirements (mandatory)

When a change affects behavior (not only formatting) or when detecting anything in the code that contradicts existing documentation, documentation updates are required in the same task. Read the requirements in `mds/update.md`. **DO NOT SKIP THIS**

## 3-minute bootstrap

@mds/live/current-status.md for implemented vs pending features.
@mds/live/file-map.md for file ownership and where to edit.
@mds/lessons-learned/README.md and any relevant lesson files.
@mds/dev-workflow.md for build/test/checklist rules.
@mds/architecture/README.md to read any documents relevant to your current task before writing/reading any code.
@mds/flows/README.md when the hard part is following behavior end-to-end rather than understanding subsystem design.

## 90-second project summary

Trama is a file-first desktop writing tool (Electron + Preact + TypeScript). The app opens a project folder, scans markdown files, edits with a rich visual editor, saves via typed IPC, reconciles `.trama.index.json`, and handles external file conflicts safely.

**Sidebar** — Section-scoped trees (`book/`, `outline/`, `lore/`), filter, keyboard basics, responsive collapse, split `+ Article` create flow (article default + map option), `+ Category`, rename/delete from right-click.

**Workspace split mode** — Both panes visible, active pane follows editor clicks, draggable center divider, pane headers show document name, split toggle via `Ctrl/Cmd + .` or context menu, per-pane session history via `Alt+Left` / `Alt+Right` plus menu-bar Back/Forward.

**Theme** — Settings exposes `light`, `dark`, `system`; preference persists through root `data-theme` tokens; system mode listens to OS theme changes. Architecture: `mds/architecture/theme-architecture.md`.

**Fullscreen/Focus Mode** — Native fullscreen toggle via `Ctrl/Cmd+Shift+F`; focus mode with `line | sentence | paragraph` scope dimming around caret via `Ctrl/Cmd+Shift+M`; `ESC` deactivates fullscreen, focus mode, or both; state persists in `trama.workspace.layout.v1`; focus Scope selector in sidebar Settings tab; sidebar hidden completely (display:none) during focus, editor grid collapses to single column, scrollbar dimmed.

**UX hardening** — Workspace toolbar removed; all controls in native right-click context menu; event bridge pattern (`trama:workspace-command` CustomEvent); smart typography (`--` → `—`, `<<` → `«`, `>>` → `»`, each Ctrl+Z reversible); Paste from Markdown converts clipboard Markdown to rich editor HTML; In-document Find via `Ctrl/Cmd+F`, Find + Replace via `Ctrl/Cmd+H`; **Recargar proyecto** via `Ctrl/Cmd+R` (intercepted before Electron native reload).

**AI import/export** — Structured clipboard import (`=== FILE: ... ===` format) with preview and `replace`/`append` modes; AI export to clipboard with multi-file selection and include/exclude frontmatter.

## Fast routing by task

| Task | Open these files |
|------|-----------------|
| Add/change IPC channel | `src/shared/ipc.ts` → `electron/ipc.ts` → `electron/preload.cts` → `src/types/trama-api.d.ts` |
| Add/change IPC handler | `electron/ipc/handlers/` + `electron/ipc-handlers.ts` → `mds/ipc-architecture.md` |
| Change sidebar UX | `src/features/project-editor/components/sidebar/sidebar-types.ts` → target component in `sidebar/` |
| Refactor sidebar action propagation | `mds/plan/sidebar-editor-actions-context-plan.md` → `src/features/project-editor/project-editor-actions-context.tsx` → `src/features/project-editor/components/sidebar/sidebar-scope-path-breadcrumb.tsx` |
| Debug sidebar path scoping | `mds/architecture/sidebar-path-scoping-model.md` → `src/features/project-editor/components/sidebar/sidebar-path-scoping.ts` → `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` → `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts` |
| Change editor behavior | `src/features/project-editor/components/rich-markdown-editor*.ts*` + `mds/architecture/editor-serialization-debounce-architecture.md` + `mds/architecture/image-handling-architecture.md` |
| Implement/debug map documents | `mds/spec/map-document-markers-spec.md` → `mds/architecture/map-document-architecture.md` → `mds/plan/map-document-markers-implementation-plan.md` → `src/features/project-editor/pane/editor-panel.tsx` + `src/features/project-editor/pane/map-editor/` |
| Implement/debug relationships charts | `mds/architecture/relationships-document-architecture.md` → `src/features/project-editor/pane/relationships-editor/` → `tests/relationships-editor-helpers.test.ts` |
| Debug relationships chart auto tag / node navigation | `mds/architecture/relationships-document-architecture.md` (debug playbook) → `relationships-node-dialog.tsx` → `relationships-editor-helpers.ts` (`resolveAutoNodeTag`) → `mds/architecture/wiki-tag-links-architecture.md` → `mds/lessons-learned/relationships-auto-tag-uses-label-not-slug.md` |
| Change save button / save affordance | `mds/flows/save-document-flow.md` → `src/features/project-editor/pane/editor-panel.tsx` → `src/features/project-editor/pane/rich-markdown-editor/toolbar-private/rich-markdown-editor-toolbar-*.ts` |
| Debug revert/discard before debounce fires | `mds/flows/rich-editor-revert-changes-flow.md` → `mds/architecture/editor-serialization-debounce-architecture.md` → `src/features/project-editor/workspace-actions.ts` → `src/features/project-editor/pane/pane-workspace.ts` → `src/features/project-editor/pane/editor-panel.tsx` → `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-external-sync.ts` |
| Plan pane exit / pane persistence refactor | `mds/architecture/split-pane-coordination.md` → `mds/architecture/editor-serialization-debounce-architecture.md` → `mds/flows/rich-editor-revert-changes-flow.md` → `mds/plan/pane-exit-deepening-tech-design.md` → `mds/plan/pane-exit-deepening-implementation-plan.md` → `src/features/project-editor/pane/pane-workspace.ts` → `src/features/project-editor/workspace-actions.ts` |
| Debug editor debounce / flush-before-switch | `mds/architecture/editor-serialization-debounce-architecture.md` → `src/features/project-editor/components/rich-markdown-editor-core.ts` → `tests/project-editor-debounce-regression.test.ts` |
| Investigate `useProjectEditor()` reruns on typing | `mds/plan/done/use-project-editor-keystroke-churn-plan.md` → `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts` → `src/features/project-editor/pane/pane-workspace.ts` → `src/features/project-editor/use-project-editor.ts` |
| Plan rich editor cleanup/refactor | `mds/plan/rich-editor-refactor-plan.md` → `mds/architecture/rich-markdown-editor-core-architecture.md` → `mds/architecture/image-handling-architecture.md` → `mds/architecture/split-pane-coordination.md` |
| Follow editor typing behavior step-by-step | `mds/flows/rich-editor-typing-flow.md` → `src/features/project-editor/components/rich-markdown-editor-core.ts` → `src/features/project-editor/components/rich-markdown-editor-quill.ts` |
| Follow split-pane activation behavior step-by-step | `mds/flows/switch-pane-flow.md` → `src/features/project-editor/workspace-actions.ts` → `src/features/project-editor/project-editor-private/state.ts` |
| Change pane document history behavior | `mds/flows/pane-history-navigation-flow.md` → `src/features/project-editor/pane/pane-workspace.ts` → `src/features/project-editor/workspace-actions.ts` → `src/features/project-editor/use-project-editor.ts` |
| Change filesystem/repo layer | `electron/services/document-repository.ts` → `electron/ipc/handlers/project-handlers/document-handlers.ts` |
| Add a test | `tests/` + `mds/dev-workflow.md` (checklist) |
| Understand split pane coordination | `mds/architecture/split-pane-coordination.md` (canonical: per-pane state contracts, two-layer model, pane-targeted action rules) |
| Debug split-pane issues | `mds/architecture/split-pane-coordination.md` → `src/features/project-editor/pane/workspace-editor-panels.tsx` → `src/features/project-editor/workspace-actions.ts` → `tests/project-editor-conflict-flow.test.ts` |
| Debug layout/flex/grid ownership | `mds/architecture/layout-ownership.md` → `src/features/project-editor/layout/use-sidebar-layout.ts` → `src/features/project-editor/project-editor-view.tsx` → `src/styles/03-app-shell-layout.css` / `04-focus-mode-layout-overrides.css` / `07-editor-fill-contract.css` / `10-responsive.css` |
| Change theme behavior or colors | `mds/architecture/theme-architecture.md` → `src/theme/use-theme-preference.ts` → `src/styles/01-theme-tokens.css` → `src/features/project-editor/components/sidebar/sidebar-settings.tsx` → `tests/theme-preference.test.ts` |
| Change focus mode visuals | `src/features/project-editor/project-editor-view.tsx` (grid style) → `src/styles/04-focus-mode-layout-overrides.css` → `src/features/project-editor/workspace-actions.ts` (toggle logic) |
| Implement Wiki Tag Links (WS1) | `mds/spec/wiki-tag-links-spec.md` → `mds/architecture/wiki-tag-links-architecture.md` → `mds/plan/done/wiki-tag-links-implementation-plan.md` → `mds/plan/phase-4-detailed-plan.md` |
| Debug Wiki Tag Links (stale index, underline offsets, Ctrl/Cmd click) | `mds/architecture/wiki-tag-links-architecture.md` → `mds/plan/done/wiki-tag-links-system-guide.md` → `mds/lessons-learned/README.md` (tag/quill lessons) → `tests/tag-index-ipc-regression.test.ts` + `tests/rich-markdown-editor-tag-overlay.test.ts` |
| Debug AI import/export | `mds/architecture/ai-import-export-architecture.md` → `src/shared/ai-import-parser.ts` → `electron/services/ai-import-service.ts` / `electron/services/ai-export-service.ts` → `electron/ipc/handlers/ai-handlers.ts` |
| Debug clipboard/paste | `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-commands.ts` → `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-clipboard.ts` → `mds/lessons-learned/quill-clipboard-matchers-must-return-delta-parameter.md` → `tests/paste-markdown.test.ts` |
| Debug book export / PDF blank pages or layout | `mds/architecture/book-export-architecture.md` (Export PDF + playbook) → `mds/lessons-learned/book-export-pdf-print-surface.md` → `electron/services/book-export-pdf-renderer.ts` → `book-export-pdf-print.css` → `npm run test -- tests/book-export` |
| Implement Help menu / Getting Started window | `mds/adr/0005-help-window-bundled-html.md` → `mds/plan/help-menu-implementation-plan.md` → `mds/architecture/help-window-architecture.md` → `electron/main-process/help-window.ts` → `electron/main-process/application-menu.ts` → `help/en/` |
| Implement project history with Git | `mds/spec/project-history-git-spec.md` → `mds/architecture/project-history-git-architecture.md` → `mds/plan/project-history-git-implementation-plan.md` → `mds/adr/0001-restore-revision-images-for-fidelity.md` → `mds/lessons-learned/revision-preview-should-use-explicit-read-only-mode.md` |
| Implement folder rename (WS2 slice) | `mds/plan/done/folder-rename-implementation-plan.md` → `src/features/project-editor/components/sidebar/sidebar-tree.tsx` → `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` → `electron/services/document-repository.ts` |
| Implement folder drag-drop or corkboardOrder integration (WS2 slice) | `mds/plan/sidebar-drag-drop-reorder-folder-move-plan.md` |
| Change startup project-open behavior | `mds/flows/startup-project-open-flow.md` → `src/features/project-editor/use-project-editor.ts` → `src/features/project-editor/use-last-project-state.ts` → `electron/ipc/handlers/project-handlers/project-folder-dialog-handler.ts` |
| Understand feature status | `mds/live/current-status.md` → `mds/plan/phase-4-detailed-plan.md` |
| Understand project structure | `mds/live/file-map.md` |
| Debug a runtime issue | `mds/live/troubleshooting.md` → `mds/lessons-learned/README.md` |

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

## Focus mode notes (important)

- The stable fix is hybrid rendering:
  - Primary: `::highlight(trama-focus-scope)` (true text-level emphasis).
  - Fallback: geometric overlay only when Highlights API is unavailable.
- Keep `paragraph` logic separate from inline scopes (`line`, `sentence`).
- Do not move focus rendering internals back into `rich-markdown-editor.tsx`; keep them in dedicated hook/helpers to preserve lint compliance and maintainability.
- Sidebar hidden via `display:none` + grid switch to `1fr` column. Do NOT use `--sidebar-width: 0px` alone — `display:none` removes the sidebar from the grid, auto-placing the editor in column 1 (which would be 0px). Always pair `display:none` with `grid-template-columns: 1fr`.
- Scrollbar dimmed during focus via `::-webkit-scrollbar-thumb` with `color-mix(in oklab, var(--border-strong) 45%, transparent)`.

## Anti-forget checks (required)

Before finalizing any implementation/doc change:

1. Confirm `mds/live/file-map.md` includes any new TS/TSX files.
2. Confirm relevant notes exist in `mds/lessons-learned/README.md` and add one if needed.
3. Confirm `mds/live/current-status.md` is still accurate for feature status.
