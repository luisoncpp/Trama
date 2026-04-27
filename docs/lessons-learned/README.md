# Lessons Learned

Knowledge that helps future development: effective strategies, counter-intuitive facts, and patterns worth remembering across the codebase.

## When to Read

- Before starting a new feature in an unfamiliar area — scan the index for relevant patterns.
- When a design decision feels uncertain — check if a similar situation was encountered before.
- When something that "should work" isn't working — the index may surface a known gotcha.

## When to Add

- When a strategy that seemed right turned out to be wrong or suboptimal.
- When something counter-intuitive was discovered through experimentation.
- When a workaround for external dependency behavior was needed and the reason isn't obvious from code.
- When a pattern proved effective and worth formalizing.

## How to Add

Create a new file in this directory named after the topic (e.g., `quill-bounds-always-relative-to-container.md`, `optimistic-ui-pattern-for-toggle-sync.md`). Then add it to the index below.

The entry should answer: **what is counter-intuitive or effective that I should know before starting similar work?**

Avoid: "bug description + fix". Prefer: "what I learned that applies to future work."

## Index

| File | Topic | Date |
|------|-------|------|
| `docx-imagerun-pixel-units.md` | `docx` `ImageRun.transformation` expects pixels, not EMU; passing EMU causes invisible/gigantic images | 2026-04-25 |
| `pdf-renderer-split.md` | Split barrel file to fix `max-lines` lint error; update order when splitting | 2026-04-17 |
| `docx-heading-centered-regression.md` | Heading styles must propagate layout state (centered) through all rendering paths | 2026-04-16 |
| `quill-text-vs-delta-index-mismatch.md` | Quill text offsets don't map 1:1 to document indexes when embeds exist; use Delta ops | 2026-04-16 |
| `ipc-handler-export-chain.md` | IPC handlers must be re-exported at `handlers/index.ts`, not just the sub-folder | 2026-04-16 |
| `folder-rename-split-layout-remap.md` | Any rename that changes paths must update split-pane layout and sidebar expanded-folder state | 2026-04-15 |
| `rich-editor-effect-deps-remount.md` | Quill init deps must stay stable; dynamic flags like spellcheck sync in separate effects | 2026-04-15 |
| `spellcheck-optimistic-toggle-sync.md` | Toggle UIs should update immediately and reconcile with backend state; never block on native reread | 2026-04-15 |
| `select-file-auto-save.md` | File selection must save and proceed; blocking on error loses the user's work | 2026-04-14 |
| `vite-reload-on-export-artifacts.md` | Vite watches generated output directories; exclude `exports/` in config | 2026-04-14 |
| `pdf-image-data-urls.md` | `path.resolve()` corrupts `data:image/` schemes; check prefix before normalizing | 2026-04-14 |
| `project-folder-required-structure.md` | Validate required folder structure at project-open time; offer to create missing | 2026-04-14 |
| `pdf-centered-heading-regression.md` | Layout state like centered must thread through both paragraph and heading code paths | 2026-04-13 |
| `pdf-lib-winansi-encoding.md` | PDF Unicode requires embedding real fonts via fontkit; standard fonts fall back to WinAnsi | 2026-04-13 |
| `epub-gen-image-limitations.md` | EPUB generators need `file://` paths; materialize data URLs to temp files first | 2026-04-14 |
| `quill-custom-data-attribute-loss.md` | Quill drops unknown `data-*` attrs during ingestion; use dedicated blots for durable objects | 2026-04-12 |
| `quill-getbounds-container-reference.md` | `quill.getBounds()` coordinates are relative to `quill.container`, not the root element | 2026-04-11 |
| `wiki-tag-modifier-click-race.md` | Use event-time modifier state (`event.ctrlKey`) for behavior, not derived React state | 2026-04-11 |
| `split-pane-pane-targeted-editor-change.md` | Every editor onChange must route to an explicit pane; global active pane causes timing bugs | 2026-04-14 |
| `focus-mode-centered-scroll-spacers.md` | Reliable EOF edge spacing in Quill: spacer pseudo-elements on `.ql-editor`, not container padding | 2026-04-07 |
| `focus-mode-rich-editor-highlight-vs-overlay.md` | CSS Highlights API is the right tool for text emphasis; overlay-only approaches fail | 2026-04-05 |
| `sidebar-path-scoping.md` | Sidebar tree paths are section-relative; IPC file operations need project-relative paths | 2026-04-04 |
| `split-pane-test-determinism.md` | Persisted layout state in tests causes non-determinism; reset mode and pane explicitly | 2026-04-04 |
| `split-pane-preferred-pane-reset.md` | Single-document state model can't guarantee pane isolation; use per-pane state explicitly | 2026-04-04 |
| `typescript-async-narrowing.md` | TypeScript narrows nullable types before async callbacks incorrectly; capture in local const | 2026-04-04 |
| `tsx-import-extension.md` | TS language server requires explicit `.tsx` extension in imports with `moduleResolution: bundler` | 2026-04-04 |
| `dev-electron-tsc-stall-retry.md` | Dev Electron TSC stall: use HTTP readiness gate instead of raw TCP for wait-on | 2026-04-04 |
| `electron-spellcheck-settings.md` | Electron spellcheck runtime-settable via `session.setSpellCheckerEnabled()`; macOS language selection managed by OS | 2026-04-04 |
| `split-pane-sidebar-layout-vs-pane-path.md` | Sidebar selectedPath must derive from layout path, not async-loading pane document path | 2026-04-04 |
| `split-pane-pane-targeted-save.md` | Manual save in split layout must receive explicit pane identity, not infer from active pane | 2026-04-04 |

> **Split-pane note:** The 7 split-pane lessons above document individual bugfixes. The canonical architectural reference is `docs/architecture/split-pane-coordination.md`, which formally specifies the per-pane state model, the two-layer state contract, and all pane-targeted action rules. These files are retained for debugging context.

| `focus-mode-split-pane-inactive.md` | Split pane focus: use strict `isActive === false` check, not `!isActive`; dim inactive pane via CSS `.is-focus-mode-inactive { opacity: 0.35 }`, not per-scope logic | 2026-04-20 |
| `focus-mode-css-vars-sync-init.md` | Focus mode CSS vars need synchronous init; RAF-only event updates miss initial render state | 2026-04-20 |
| `css-patch-corruption.md` | CSS patch tool can inject rules inside open blocks; use large anchors, validate after each edit | 2026-04-04 |
| `index-reorder-payload-id-vs-path.md` | Reorder payloads for `.trama.index.json` must use same key/value identity model as reconciliation and downstream readers | 2026-04-19 |
| `corkboard-order-path-scoping.md` | `corkboardOrder` keys are project-relative; sidebar tree uses section-relative paths — conversion must happen at the boundary (`sidebar-panel-body.tsx`) | 2026-04-21 |
| `tag-overlay-stale-bounds-on-layout-change.md` | Quill `getBounds()` results are layout-dependent; never cache them across renders — compute fresh at render or event time | 2026-04-21 |
| `find-overlay-scroll-stale-bounds.md` | Find overlay highlight must recompute bounds on every scroll; same stale-bounds pattern as tags, plus `getBoundingClientRect()` over `offsetTop/offsetLeft` | 2026-04-22 |
| `cross-folder-drag-drop-two-ipcs.md` | For cross-folder file drop + reorder, calling two existing IPCs sequentially (`moveFile` then `reorderFiles`) is simpler than creating a combined IPC; avoids touching backend contracts and keeps frontend logic testable in pure helpers | 2026-04-22 |
| `focus-mode-quill-selection-desync.md` | Programmatic scroll (`container.scrollTop`) desynchronizes Quill's internal selection; preserve selection before scroll and restore after with `'silent'` flag | 2026-04-23 |
| `global-esc-shortcut-modal-guard.md` | Global `window` ESC listener must query `[aria-modal="true"]` before acting; `stopPropagation()` won't block sibling listeners on same element | 2026-04-24 |
| `find-replace-quill-range.md` | Replace in Quill requires plain-text-to-Quill-index conversion via `mapPlainTextIndexToQuillIndex`; `replaceAll` must process matches from end to start to avoid index drift | 2026-04-24 |
| `focus-mode-css-grid-display-none-auto-place.md` | `display:none` removes grid items from the grid, causing remaining items to auto-place into the first cell; always recalculate `grid-template-columns` when hiding grid children | 2026-04-25 |
| `focus-mode-scrollbar-dimming.md` | Scrollbar in focus mode stands out; dim via `::-webkit-scrollbar-thumb` with `color-mix` on `.ql-container.ql-snow` | 2026-04-25 |
| `turndown-base64-replacement-performance.md` | Turndown `replacement` callbacks must return small strings; returning multi-megabyte base64 causes 25+ s per keystroke | 2026-04-25 |
| `editor-debounce-closure-capture.md` | Debounce timer must capture `editor`/`documentId` in closure, never read refs at fire time; cleanup cancels only; flush returns content; mutate ref object in-place; split dirty flag from serialization | 2026-04-26 |
