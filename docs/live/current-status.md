# Current Status

> **New conversation?** Open `docs/START-HERE.md` first — it routes you to the 3-4 files you actually need.

## Product state

Phase 2, Phase 3 (WS1–WS5), and Phase 4 WS1/wiki-tag-links, WS2/folder-operations, WS5/AI-import-export are complete.

**Implemented:** Electron + Vite + Preact shell, typed IPC (Zod/envelope), project open flow with folder-structure validation, recursive markdown scan, read/save via repository layer, YAML frontmatter, `.trama.index.json` reconciliation, external-file-watch conflict detection, rich markdown visual editor (Quill-based), sidebar (hierarchical tree, filter, create/rename/delete, collapse), workspace split mode (dual pane, drag divider, click-to-activate, persistence), theme system (light/dark/system, WCAG AA, matchMedia sync), fullscreen/focus mode (line/sentence/paragraph scope dimming, CSS Highlights API + fallback), UX hardening (context menu controls, smart typography, Paste from Markdown, in-document Find), editor serialization debounce, spellcheck controls, Wiki tag links (TagIndexService, implicit matching, Ctrl+click navigation), folder rename/delete/move (end-to-end including DnD), drag-and-drop file reorder/move with corkboardOrder integration, AI import/export (clipboard pipeline, multi-file, replace/append modes), book export (multi-format: markdown/html/docx/epub/pdf with directives and images), ZuluPad import

**Not implemented:** Templates (WS3).

**Next step:** Folder move/reparent reintroduced in dedicated slice after merge.

## Reliability

- `npm run build` ✅
- `npm run lint` ✅
- `npm run test` ✅ (61 suites, 443 tests)
- `npm run test:smoke` ✅

In sandboxed agent environments use the PowerShell script — see `docs/dev-workflow.md`.

## Known tradeoffs

- `sandbox: false` for preload stability.
- Index refresh still does full reconciliation in several write flows (safe, optimizable later).
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