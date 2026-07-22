# New sidebar rail sections must join the persistence allowlist

## Counter-intuitive fact

Adding a `SidebarSection` union member + rail item + panel branch is **not** enough for section-selection persistence. `use-sidebar-ui-state.ts` (`trama.sidebar.ui.v1`) validates the persisted `activeSection` against a hardcoded chain of `parsed.activeSection === '...'` comparisons — not against the `SidebarSection` type or `SIDEBAR_SECTION_CONFIG`. A section missing from that chain is accepted everywhere else, but on the next app start the stored value fails validation and the sidebar **silently falls back to `explorer`**.

No type error, no test failure: the union member satisfies the compiler, and unit tests inject state directly instead of round-tripping localStorage.

## Checklist for a new rail section

1. `SidebarSection` in `project-editor-types.ts`.
2. `ContentSidebarSection` Exclude in `sidebar-section-roots.ts` if the section has no folder root (keeps `SIDEBAR_SECTION_CONFIG` and create flows scoped to real content sections).
3. Rail item + icon in `sidebar-rail.tsx` / `sidebar-rail-icons.tsx`.
4. Body branch in `sidebar-panel-body.tsx`.
5. **Persistence allowlist in `use-sidebar-ui-state.ts`** — the step that is easy to forget.
6. `buildEditorActionsSpies` key list in `tests/helpers/editor-actions-test-helper.ts` if the section's panel dispatches new actions.

Discovered while adding the `contents` rail section (document contents navigation).
