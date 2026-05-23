# Current Status

> **New conversation?** Open `docs/START-HERE.md` first — it routes you to the 3-4 files you actually need.

## Product state

Phase 2, Phase 3 (WS1–WS5), and Phase 4 WS1/wiki-tag-links, WS2/folder-operations, WS5/AI-import-export are complete.

**Implemented:** Electron + Vite + Preact shell, typed IPC (Zod/envelope), project open flow with folder-structure validation, recursive markdown scan, read/save via repository layer, YAML frontmatter, `.trama.index.json` reconciliation, external-file-watch conflict detection, rich markdown visual editor (Quill-based), sidebar (hierarchical tree, filter, create/rename/delete, collapse), workspace split mode (dual pane, drag divider, click-to-activate, persistence), per-pane session document history with browser-style back/forward (`Alt+Left`, `Alt+Right`, menu bar Back/Forward, toolbar Back), theme system (light/dark/system, WCAG AA, matchMedia sync), fullscreen/focus mode (line/sentence/paragraph scope dimming, CSS Highlights API + fallback), UX hardening (context menu controls, smart typography, Paste from Markdown, in-document Find), editor serialization debounce, spellcheck controls, Wiki tag links (TagIndexService, implicit matching, Ctrl+click navigation), folder rename/delete/move (end-to-end including DnD), drag-and-drop file reorder/move with corkboardOrder integration, AI import/export (clipboard pipeline, multi-file, replace/append modes), book export (multi-format: markdown/html/docx/epub/pdf with directives and images), ZuluPad import, revert changes button in editor toolbar (recarga desde disco, descarta cambios sucios), document zoom via Ctrl++/Ctrl+- (shared across twin panes), markdown image persistence via project-local `res/*.png` files with backward-compatible loading of legacy embedded-image documents and optional linked-image deletion on article remove

**Not implemented:** Templates (WS3).

**Completed infrastructure:**
- `pane-isolation-plan-v2` — Módulo `pane/` fully encapsulates all pane mutation; `PaneWorkspace` is the exclusive mutation surface; Preact setters are injected via `usePaneWorkspace` factory hook; `markPaneSaved` is private; `saveNow` is awaitable (see `docs/plan/done/pane-isolation-plan-v2.md`, `docs/lessons-learned/awaitable-save-actions.md`).

**Next step:** Folder move/reparent reintroduced in dedicated slice after merge.

## Reliability

- `npm run build` ✅
- `npm run lint` ✅
- `npm run test` ✅ (76 suites, 681 tests)
- `npm run test:smoke` ✅

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
