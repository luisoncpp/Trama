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
