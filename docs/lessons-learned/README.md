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
| `project-local-asset-import-should-stay-in-electron.md` | External asset import flows that must copy files into the project should keep the filesystem copy and collision handling in Electron, not the renderer | 2026-05-30 |
| `non-text-editor-surfaces-should-update-pane-meta-directly.md` | Non-text editors that edit frontmatter-backed behavior should mutate pane `meta` directly and reuse the normal save pipeline instead of encoding YAML into the body string | 2026-05-30 |
| `document-scoped-ephemeral-ui-state-should-reset-on-navigation.md` | Document-scoped transient UI like revision rails must clear hidden target state when navigation closes them | 2026-05-29 |
| `revision-preview-should-use-explicit-read-only-mode.md` | Git revision previews need an explicit read-only editor mode, not the generic disabled state | 2026-05-28 |
| `git-add-should-stage-changed-managed-paths-not-missing-roots.md` | For scoped Git snapshots, stage exact changed managed paths instead of broad roots that may not exist | 2026-05-28 |
| `startup-project-restore-should-clear-invalid-memory.md` | Remembered startup project paths should be cleared on validation failure before falling back to the picker | 2026-05-28 |
| `toolbar-icon-buttons-should-sync-labels-not-text.md` | Icon toolbar controls should preserve SVG markup and express state through tooltip/ARIA sync instead of replacing button text | 2026-05-22 |
| `incremental-project-updates.md` | Centralize incremental state updates in `openProject` with a backend cache; let the frontend own the delta; fall back to full scan for external events | 2026-05-20 |
| `private-directory-makes-the-seam-obvious.md` | Put seam-only hook assembly behind an explicitly private directory so the public Module stays obvious | 2026-05-22 |
| `explicit-toolbar-order-needs-one-dom-owner.md` | Toolbar order stays readable when one private Module owns DOM composition and explicit order, even if Quill remains the seam | 2026-05-21 |
| `broken-project-images-need-editor-only-placeholders.md` | Missing `res/*.png` files must degrade to editor-only placeholders at repository read time, then rehydrate back to the original markdown image syntax on save | 2026-05-21 |
| `docx-imagerun-pixel-units.md` | `docx` `ImageRun.transformation` expects pixels, not EMU; passing EMU causes invisible/gigantic images | 2026-04-25 |
| `quill-setcontents-must-return-cursor.md` | Quill helpers that build and apply a Delta via `setContents` must return the cursor position for the new document, not rely on stale old-document indices | 2026-05-15 |
| `adjacent-center-toggle-should-extend-segment.md` | Centering a line directly adjacent to a centered block should extend that segment, not create a second adjacent pair of boundaries | 2026-05-14 |
| `center-end-seam-delete-uses-boundary-adjacency.md` | Center seam-safe Backspace/Delete in Quill must guard on document indexes adjacent to the `center:end` embed, not inferred deleted text | 2026-05-14 |
| `quill-keyboard-defaults-need-init-bindings.md` | Quill default `Backspace`/`Delete` behavior can only be preempted by keyboard bindings provided at editor initialization, not late `addBinding()` calls | 2026-05-14 |
| `quill-center-segment-identity-vs-structure.md` | Recomputed Quill center segments must be compared structurally by boundary indexes, not by object identity | 2026-05-14 |
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
| `shared-sentinel-scope-root.md` | Shared `SCOPED_ROOT_KEY = ''` sentinel for section-root scope in `scopeCorkboardOrder` and `sortTreeRowsByOrder` — avoids silent ordering failure when only one file is updated | 2026-04-30 |
| `corkboard-order-path-scoping.md` | `corkboardOrder` keys are project-relative; sidebar tree uses section-relative paths — conversion must happen at the boundary (`sidebar-panel-body.tsx`) | 2026-04-21 |
| `sidebar-path-brands-deepen-the-seam.md` | Path scoping only becomes safe when the seam owns branded section-relative/project-relative types, not plain strings | 2026-05-08 |
| `quill-getbounds-multiline-wrap.md` | Quill `getBounds()` returns a single bounding rect for wrapped ranges; use `Range.getClientRects()` via `editor.scroll.leaf()` for per-line geometry | 2026-05-01 |
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
| `revert-needs-force-apply-when-disk-content-is-text-identical.md` | Revert/disk reload must carry an explicit apply signal beyond normal value equality, because the clean disk markdown may equal the last clean parent value while Quill DOM still contains unsaved typing | 2026-05-22 |
| `quill-render-keypress-image-loss.md` | Rich editor image documents need one canonical in-memory representation; base64 markdown and `IMAGE_PLACEHOLDER` markdown must normalize to the same value or Quill will re-render equivalent content destructively | 2026-04-26 |
| `pane-persistence-helper-owns-flush-save.md` | Split-pane persistence stays correct when `flush -> fallback -> save` lives in one pane-targeted helper shared by save/switch/close/autosave flows | 2026-04-27 |
| `awaitable-save-actions.md` | UI save actions that wrap async persistence should return a Promise so tests and chained flows can observe post-save pane state deterministically | 2026-05-03 |
| `editor-onchange-image-hydration.md` | `onChange` must hydrate image placeholders to embedded images before forwarding to parent state, or the parent gets corrupted and cascading re-renders destroy images in Quill | 2026-04-28 |
| `editor-value-sync-canonical-api.md` | Canonical editor-value comparison should live behind one named API so image placeholder equivalence is reused consistently across lifecycle hooks | 2026-04-28 |
| `projected-state-vs-pane-target-state.md` | Active pane projection (`selectedPath`, `isDirty`, etc.) lives in one pure function — `deriveActivePaneDocument` — not copied across three modules | 2026-05-02 |
| `windows-chokidar-handle-readdir-stale.md` | Windows: chokidar's `ReadDirectoryChangesW` handle keeps deleted directory entries visible to `readdir`; must `watcher.close()` before `scanProject` in `handleOpenProject` | 2026-04-29 |
| `pane-persistence-single-source-of-truth.md` | `useProjectEditorPanePersistence` must be instantiated once in `useProjectEditor` and passed down; creating it in both `useProjectEditorActions` and `useProjectEditor` produces two `saveDocumentNow` closures that diverge and cause save-before-switch bugs | 2026-04-30 |
| `sub-state-memoization-prevents-render-cascades.md` | Decompose large state objects into focused memoized sub-states; action hooks should depend only on the slices they read, not a monolithic `values` object | 2026-05-01 |
| `ref-mutation-no-trigger-rerender.md` | Mutar `ref.current` en un effect no dispara re-render; si el consumer del ref solo corre en fase render, se necesita un state setter explícito (ej: tag overlay dirty flag tras cambio de documento) | 2026-05-01 |
| `conflict-actions-need-real-document-state.md` | Passing a stub `documentState` with `selectedPath: null` to conflict action hooks silently breaks flows like save-as-copy because the action returns early on null checks; derive the real document state from pane + layout when wiring secondary actions | 2026-05-01 |
| `document-image-links-need-readtime-hydration.md` | Saving markdown with `res/*.png` links still requires read-time hydration back to embedded data URLs so the editor's placeholder/image-cache model stays canonical | 2026-05-10 |
| `dirty-flag-should-not-rewrite-pane-content.md` | Immediate dirty signals and debounced content updates must be separate pane mutations; dirty-only calls should become a no-op once already dirty | 2026-05-27 |
| `effects-should-depend-on-semantic-state-not-helper-identity.md` | Stable helper instances require effects to depend on real state changes, not helper object recreation | 2026-05-27 |
| `inline-helper-callbacks-break-memoized-action-groups.md` | One inline helper callback can keep whole memoized action groups churning even after the main state dependencies are stable | 2026-05-27 |
| `book-export-preprocess-images-before-renderers.md` | Book export image handling is more reliable when local markdown paths are converted once before renderer dispatch instead of being re-resolved independently per format | 2026-05-10 |
| `inline-images-in-pdf-docx-export.md` | Inline images within paragraph text (e.g., `text ![](img.png) more text`) are silently dropped in PDF/DOCX unless line parsing uses segment-based detection instead of whole-line classification | 2026-05-10 |
| `layout-component-prevents-micro-file-proliferation.md` | Lint-driven atomization (`max-lines: 200`) can produce shallow modules; a layout component like `SettingsField` restores depth by owning the repeated wrapper structure, letting inner components stay pure control logic | 2026-05-16 |
| `shallow-hook-fragmentation-to-deep-modules.md` | ~15 tiny hook files with interfaces larger than implementations failed the deletion test; collapsing into 2–3 cohesive plain modules restores locality and leverage | 2026-05-20 |
| `instance-state-must-survive-hook-recreation.md` | State stored inside hook-created instances (e.g., `useMemo`) is destroyed on every dependency change; lift long-lived state to stable refs outside the instance lifecycle | 2026-05-19 |
| `pane-history-needs-stable-store.md` | Session navigation history cannot live inside recreated `PaneWorkspace` instances; keep it in a stable ref and reset it only in explicit open/clear flows | 2026-05-21 |
| `pane-history-initial-seeding-belongs-in-open-project.md` | Initial pane-history entries must be seeded inside `openProject()` after reset; path-based effects can miss the restore when persisted paths do not change | 2026-05-27 |
| `flex-shrink-zero-for-fixed-width-flex-items.md` | Fixed-width flex items (like sidebar rails) must explicitly define `flex-shrink: 0` or they will collapse when sibling items contain content that resists wrapping or shrinking | 2026-05-23 |
| `memo-boundaries-need-stable-props-at-the-call-site.md` | `memo(...)` only blocks typing churn when the parent also stabilizes object/callback props passed into the shell boundary | 2026-05-27 |
| `vitest-include-pattern-can-skip-test-tsx-files.md` | The current Vitest include glob only matches `tests/**/*.test.ts`, so `.test.tsx` files are silently excluded | 2026-05-27 |
