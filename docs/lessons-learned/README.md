# Lessons Learned

Record implementation lessons here so future work avoids repeated mistakes.

## When to Read

- Before starting a new feature — scan the index for relevant topics.
- When hitting an unexpected issue — check if it's been seen before.

## When to Add

- After resolving a bug that took significant debugging time.
- When a design decision turned out to be wrong and was corrected.
- When an external dependency behaved unexpectedly.
- When a workaround was required and the reason isn't obvious from code.

## How to Add

Create a new file in this directory named after the topic (e.g., `auth-token-refresh.md`, `ci-timeout-flakes.md`). Then add it to the index below.

## Index

| File | Topic | Date |
|------|-------|------|
| `typescript-async-narrowing.md` | Nullable state narrowed before async callback still surfaced TS errors; fix by capturing local const before async boundary | 2026-04-04 |
| `tsx-import-extension.md` | TS language server (moduleResolution: bundler) does not resolve `.tsx` files without explicit extension in imports | 2026-04-04 |
| `css-patch-corruption.md` | Patch tool may inject CSS rule blocks inside open `:root {}` / `body {}` blocks; apply CSS edits in small isolated hunks | 2026-04-04 |
| `sidebar-path-scoping.md` | Sidebar operations can break when section-relative tree paths are not remapped to project-relative paths before IPC file actions | 2026-04-04 |
| `split-pane-preferred-pane-reset.md` | `preferredPane` reopen issues resolved by migrating from single-document state to explicit per-pane document state and pane-targeted loads | 2026-04-04 |
| `split-pane-test-determinism.md` | Split-mode tests can flip unexpectedly if persisted layout state is not normalized during setup; force mode/pane explicitly before assertions | 2026-04-04 |
| `focus-mode-rich-editor-highlight-vs-overlay.md` | Focus mode stabilized by using CSS Highlights API as primary text emphasis and non-mutating overlay only as fallback; avoid DOM injection into Quill editor | 2026-04-05 |
| `focus-mode-centered-scroll-spacers.md` | Focus mode centering near document edges is reliable only with viewport-based caret geometry and real content-side spacers; avoid scroll-container padding | 2026-04-07 |
| `wiki-tag-modifier-click-race.md` | Ctrl/Cmd+click wiki-tag navigation can race when behavior depends on derived key state; use event modifier state and mousedown capture for reliability | 2026-04-11 |
| `quill-getbounds-container-reference.md` | `quill.getBounds()` is relative to `quill.container`, not `quill.root`; using root doubles the centering margin and drifts overlays/hit-tests right as editor widens | 2026-04-11 |
| `tag-index-stale-after-save.md` | Tag navigation relied on stale in-memory `TagIndexService` after saves; fix by rebuilding tag index during document reconciliation and cover with IPC regression tests | 2026-04-12 |
| `quill-custom-data-attribute-loss.md` | Quill import/sanitization drops unknown custom `data-*` directive markers; use dedicated blots for durable semantic round-trip objects | 2026-04-12 |
| `pdf-lib-winansi-encoding.md` | PDF export Unicode failures were resolved by embedding system Unicode fonts via `@pdf-lib/fontkit`, plus regression tests for Unicode and pagebreak variants | 2026-04-13 |
| `pdf-image-data-urls.md` | PDF image embedding failed on base64 data URLs because `path.resolve()` corrupted the scheme; fixed by detecting `data:image/` prefix before path normalization | 2026-04-14 |
| `epub-gen-image-limitations.md` | EPUB image embedding fixed by materializing data URLs to temp files and rewriting sources to `file://` paths; includes Windows `file://C:/...` path handling to avoid duplicated drive-prefix errors. | 2026-04-14 |
| `vite-reload-on-export-artifacts.md` | Dev server reloaded the full app after HTML book export because generated files under `exports/` were watched by Vite; fixed by ignoring `**/exports/**` in `vite.config.ts` watch settings. | 2026-04-14 |
| `split-pane-pane-targeted-editor-change.md` | Split editors must route onChange updates to an explicit pane; relying on global active pane can mark the wrong pane dirty due to event timing. | 2026-04-14 |
| `split-pane-pane-targeted-save.md` | Split-pane manual save buttons must target the pane that emitted the action; using global active-pane state can save the wrong document. | 2026-04-14 |
| `select-file-auto-save.md` | File selection must auto-save and proceed, not block with error; skipping reload when selecting the same file preserves just-saved content. | 2026-04-14 |
| `split-pane-sidebar-layout-vs-pane-path.md` | Split-pane sidebar showed wrong file when switching panes because `selectedPath` derived from loaded pane state instead of layout path; fix by using `workspaceLayout.primaryPath`/`secondaryPath` instead of `pane.path` | 2026-04-14 |
| `split-pane-active-pane-blocked-by-dirty-guard.md` | Clicking inactive pane failed to switch `activePane` when active pane was dirty: `setWorkspaceActivePane` had a blocking dirty guard like `selectFile` used to; fix by auto-saving dirty pane before switching (same as the `selectFile` pattern) | 2026-04-14 |
| `project-folder-required-structure.md` | Validate `book/lore/outline` at folder-pick time, offer create-or-reselect flow, and loop picker when user rejects auto-create. | 2026-04-14 |
| `electron-spellcheck-settings.md` | Electron spellcheck language changes are runtime session APIs on Windows/Linux; macOS only supports enable/disable from app side. | 2026-04-15 |
| `spellcheck-optimistic-toggle-sync.md` | Spellcheck toggle UI can bounce if renderer waits for immediate native reread; use optimistic updates and return normalized state from main process. | 2026-04-15 |
| `rich-editor-effect-deps-remount.md` | Including runtime flags like `spellcheckEnabled` in Quill init-effect deps can recreate the editor and leave stale DOM references; keep init deps stable and sync dynamic flags in dedicated effects. | 2026-04-15 |
| `folder-rename-split-layout-remap.md` | Folder rename must remap split-pane layout paths and sidebar expanded-folder paths to avoid context loss after refresh. | 2026-04-15 |
| `pdf-centered-heading-regression.md` | PDF heading styling fix regressed `trama:center`; heading and paragraph render paths must both receive layout alignment state. | 2026-04-16 |
| `docx-heading-centered-regression.md` | DOCX heading style fix regressed centered alignment; `createHeadingParagraph` must receive and apply `centered` flag like `createTextParagraph` does. | 2026-04-16 |
| `ipc-handler-export-chain.md` | IPC handler exports need re-export at `handlers/index.ts` level, not just `project-handlers/index.ts` | 2026-04-16 |
| `quill-text-vs-delta-index-mismatch.md` | `getText()` offsets drift from Quill document indexes when embeds exist; map text offsets through Delta ops before `getBounds` to avoid shifted/oversized tag underlines | 2026-04-16 |
