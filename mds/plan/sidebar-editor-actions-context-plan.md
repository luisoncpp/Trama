# Sidebar editor-actions context plan

> **Status:** In progress. Phase 1 landed on 2026-06-10.

Goal: remove deep sidebar prop drilling for `ProjectEditorActions` by exposing renderer actions through a stable Preact context while keeping sidebar state as props.

## Why this exists

Before this refactor, sidebar leaves like the project-root breadcrumb received shell actions through multiple rename-heavy prop layers (`revealInFileManager` → `onRevealInFileManager`). That made action tracing hard and inflated sidebar prop surfaces.

## Current shape

### Provider

- `src/features/project-editor/project-editor-actions-context.tsx`
  - `EditorActionsProvider`
  - `useEditorActions()`

The provider mounts in `src/features/project-editor/project-editor-view.tsx` and exposes a **stable facade over a ref**:

1. `ref.current = actions` runs during render so children always see the latest action set before any event fires.
2. The context value identity stays stable.
3. Consumers can call actions without triggering context-driven rerenders on every editor state change.

## Phase breakdown

### Phase 1 — infra + project-root reveal vertical slice ✅

Files changed:

- `src/features/project-editor/project-editor-actions-context.tsx`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/components/sidebar/sidebar-scope-path-breadcrumb.tsx`
- `src/features/project-editor/components/sidebar/use-sidebar-project-root-context-menu.ts`
- `src/features/project-editor/components/sidebar/sidebar-types.ts`
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx`
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
- `src/features/project-editor/components/sidebar/sidebar-explorer-body/sidebar-explorer-body-private/sidebar-explorer-body.tsx`
- `src/features/project-editor/project-editor-shell-props.ts`
- `src/features/project-editor/project-editor-shell.tsx`
- `tests/helpers/editor-actions-test-helper.ts`
- `tests/sidebar-panels.test.ts`

What changed:

- The project-root breadcrumb and its context-menu hook now consume `pickProjectFolder`, `closeProject`, and `revealInFileManager` from `useEditorActions()`.
- Those three props were deleted from the sidebar prop chain.
- `revealInFileManager` still remains in shell actions because file/folder context menus still use the scoped `onRevealPathInFileManager` path.
- Tests now use a shared provider-backed helper so sidebar leaves can be rendered under the actions context.

### Remaining phases

#### Phase 2 — scoped CRUD and create dialogs

- Add sidebar section-root scoping context.
- Move scoped file/folder CRUD actions to context-backed hooks.
- Delete shell file-action adapters once all sidebar CRUD consumers stop taking those props.

#### Phase 3 — tree/workspace sidebar actions

- Move `selectFile`, `reorderFiles`, `moveFile`, `moveFolder`, `setSidebarSection`, and collapse actions to context/scoped hooks.

#### Phase 4 — transfer/settings actions

- Move `saveSnapshot` and `setFocusScope` to the actions context.
- Keep theme, spellcheck, and dialog opener props out of scope because they do not originate from `ProjectEditorActions`.

#### Phase 5 — cleanup

- Remove dead shell adapter layers.
- Update sidebar flow docs for the final action path.

## Invariants

1. Context is for **actions only**, not project/editor/sidebar state.
2. The context value must keep stable identity; do not provide `model.actions` directly.
3. Sidebar section-relative vs project-relative path scoping still happens at the sidebar boundary; actions context does not replace path scoping.
4. `on*` props remain valid for non-editor-action callbacks like dialog openers and app-owned theme/spellcheck settings.

## Focused verification

- `npx vitest run tests/sidebar-panels.test.ts`
- `npx vitest run tests/sidebar-scope-path-breadcrumb.test.ts tests/sidebar-project-root-context-menu.test.ts`
- `npm run test`
- `npm run lint`

## Related docs

- `mds/architecture/sidebar-architecture.md`
- `mds/architecture/sidebar-path-scoping-model.md`
- `mds/lessons-learned/stable-context-facade-prevents-preact-consumer-rerenders.md`
