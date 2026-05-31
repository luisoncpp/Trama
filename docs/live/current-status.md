# Current Status

> **New conversation?** Open `docs/START-HERE.md` first — it routes you to the 3-4 files you actually need.

## Product state

Phase 2, Phase 3 (WS1–WS5), and Phase 4 WS1/wiki-tag-links, WS2/folder-operations, WS5/AI-import-export are complete.

**Implemented:** Electron + Vite + Preact shell, typed IPC (Zod/envelope), project open flow with folder-structure validation plus startup restore of the last valid project root, recursive markdown scan, read/save via repository layer, YAML frontmatter, `.trama.index.json` reconciliation, external-file-watch conflict detection, rich markdown visual editor (Quill-based), map documents with interactive markers (frontmatter `type: map`, image base layer, pan/zoom, marker create/edit/delete, tag-based navigation, sidebar creation flow that copies a chosen image into `res/` and starts with no markers), sidebar (hierarchical tree, filter, create/rename/delete, collapse), workspace split mode (dual pane, drag divider, click-to-activate, persistence), per-pane session document history with browser-style back/forward (`Alt+Left`, `Alt+Right`, menu bar Back/Forward, toolbar Back), theme system (light/dark/system, WCAG AA, matchMedia sync), fullscreen/focus mode (line/sentence/paragraph scope dimming, CSS Highlights API + fallback), UX hardening (context menu controls, smart typography, Paste from Markdown, in-document Find), editor serialization debounce, spellcheck controls, Wiki tag links (TagIndexService, implicit matching, Ctrl+click navigation), folder rename/delete/move (end-to-end including DnD), drag-and-drop file reorder/move with corkboardOrder integration, AI import/export (clipboard pipeline, multi-file, replace/append modes), book export (multi-format: markdown/html/docx/epub/pdf with directives and images), ZuluPad import, revert changes button in editor toolbar (recarga desde disco, descarta cambios sucios), document zoom via Ctrl++/Ctrl+- (shared across twin panes), markdown image persistence via project-local `res/*.png` files with backward-compatible loading of legacy embedded-image documents and optional linked-image deletion on article remove, local Git history backend plus renderer integration for sidebar snapshots and pane-local revision preview/load UI

**Not implemented:** Templates (WS3).

**Completed infrastructure:**
- `pane-isolation-plan-v2` — Módulo `pane/` fully encapsulates all pane mutation; `PaneWorkspace` is the exclusive mutation surface; Preact setters are injected via `usePaneWorkspace` factory hook; `markPaneSaved` is private; `saveNow` is awaitable (see `docs/plan/done/pane-isolation-plan-v2.md`, `docs/lessons-learned/awaitable-save-actions.md`).
- `useProjectEditor-keystroke-churn` — Issues #1–#4 completed end-to-end: (1) dirty signal split so already-dirty panes are no-ops, (2) stable `PaneWorkspace` identity, (3) memoized action groups, (4) narrowed shell/dialog subscriptions so typing only re-renders pane/editor surfaces. See `docs/plan/done/use-project-editor-keystroke-churn-plan.md`.

## Maintenance notes

- Project editor layout ownership is now consolidated: `useSidebarLayout()` owns effective sidebar collapse/width, `.editor-workspace` is the sole sidebar-width writer, and `.editor-fill-column` names the shared editor height-fill contract.
- Project editor CSS is physically split under `src/styles/01-10-*.css`, imported in numeric order from `src/index.css` to preserve cascade order while making layout ownership inspectable by file.
- Theme architecture is now documented in `docs/architecture/theme-architecture.md`; dark-mode editor interaction states use the blue accent model instead of an accidental warm Quill-specific active token.

**Next step:** Folder move/reparent reintroduced in dedicated slice after merge.

## Reliability

- `npm run build` ✅ on the current branch after MapEditor background rendering layout fixes.
- Focused renderer regressions ✅: `npm run test -- tests/use-project-editor.test.ts tests/sidebar-panels.test.ts tests/rich-markdown-editor.test.ts`
- `npm run lint` ⚠️ currently blocked by max-lines violations while the Git-history renderer slice is being split further; one existing failure is `electron/preload.cts`.
- `npm run test:smoke` — not re-run for this branch snapshot.

In sandboxed agent environments use the PowerShell script — see `docs/dev-workflow.md`.

## Known tradeoffs

- `sandbox: false` for preload stability.
- Index refresh now uses incremental updates for create/rename/delete/move/reorder; only save uses `updateCache`; full reconciliation still runs on initial open and cache miss.
- External change handling favors safety over convenience (prevents overwrite when dirty).
- PDF export prefers Unicode system serif fonts, falls back to `pdf-lib` standard fonts.

## Phase 4

| Workstream | Status |
|---|---|
| WS1 — Wiki Tag Links | ✅ Complete |
| WS2 — Folder Operations | ✅ Complete (rename/delete/move + DnD + corkboardOrder) |
| WS3 — Templates | Pending |
| WS4 — Corkboard | ❌ Cancelled |
| WS5 — AI Import/Export | ✅ Complete |
