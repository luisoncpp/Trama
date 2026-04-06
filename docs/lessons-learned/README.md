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
