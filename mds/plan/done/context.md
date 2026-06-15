# Editor Actions Context — kill sidebar prop drilling

## Context

Actions built by `useProjectEditor()` (e.g. `revealInFileManager`, `renameFile`, `selectFile`) currently reach leaf components through 12–16 levels of prop drilling and three re-wrap layers ([project-editor-shell-props.ts](C:\Proyectos\trama\src\features\project-editor\project-editor-shell-props.ts), [sidebar-action-group.ts](C:\Proyectos\trama\src\features\project-editor\project-editor-private\sidebar-action-group.ts), [sidebar-panel-body.tsx](C:\Proyectos\trama\src\features\project-editor\components\sidebar\sidebar-panel-body.tsx)), with renames at each layer (`revealInFileManager` → `onRevealInFileManager`). This makes flows untraceable by grep — the problem that prompted `mds/flows/*.md`. Fix: expose **actions** (not state) via a Preact context; leaf components consume them directly. Migrate by impact: sidebar first (depth 12–16, ~25 leaves), panes are already shallow (4–7) and stay as-is.

## Key design decisions

### 1. Context value = stable facade over a ref

Verified: `model.actions` is rebuilt on essentially every state change ([actions.ts:154](C:\Proyectos\trama\src\features\project-editor\project-editor-private\actions.ts) — `useMemo` over action groups whose deps include `layoutState`/`projectState`/`uiState`/`sidebarState`). Providing it raw would re-render every consumer on every keystroke, and Preact context updates bypass `memo()` boundaries — worse than today.

So the Provider:
- keeps `ref.current = actions` assigned **during render** (fresh before any child renders/fires events),
- exposes a facade built once (`useMemo(..., [])`) whose methods delegate: `(...args) => ref.current[key](...args)` (preserving returned Promises),
- context value identity never changes → zero context-driven re-renders, zero stale closures.

### 2. Naming convention (one name end-to-end)

> A handler crosses layers under exactly one name and signature: its `ProjectEditorActions` key (`revealInFileManager`, `renameFile({path,newName})`…). No `onX` rebinding wrappers. `on*` is reserved for (a) genuinely local UI callbacks consumed within one parent/child pair (`onDismiss`, `onFilterQueryChange`) and (b) callbacks NOT in `ProjectEditorActions`: theme/spellcheck (originate in `src/app.tsx`) and dialog openers (`onImport`/`onExport`/`onExportBook`/`onImportZulu` — owned by `useProjectEditorViewDialogs`). Scoped variants keep the same name; the hook name carries the semantics.

### 3. Scoping (sidebar section roots)

`renderExplorer` in [sidebar-panel-body.tsx:99-130](C:\Proyectos\trama\src\features\project-editor\components\sidebar\sidebar-panel-body.tsx) wraps path-taking actions with `scopePath()` per section root. After migration: a tiny `SidebarSectionScopeContext` provides `sectionConfig.root`; `useScopedSidebarActions()` reads raw actions from context + root from scope context and returns same-name scoped wrappers, reusing the existing helpers in `sidebar-path-scoping.ts` (`toProjectPath`, `buildScopedReorderHandler`, `buildScopedMoveFileHandler`, `buildScopedMoveFolderHandler`).

## New files

| File | Exports |
|---|---|
| `src/features/project-editor/project-editor-actions-context.tsx` | `EditorActionsProvider({ actions, children })`; `useEditorActions(): ProjectEditorActions` (throws if no provider). Named to avoid collision with private `useProjectEditorActions` in `project-editor-private/actions.ts`. Facade built via key loop (eslint 50-line limit). |
| `src/features/project-editor/components/sidebar/sidebar-section-scope-context.ts` | `SidebarSectionScopeProvider({ root, children })`; `useSidebarSectionRoot()` |
| `src/features/project-editor/components/sidebar/use-scoped-sidebar-actions.ts` | `useScopedSidebarActions()` — stable (both inputs stable per section) |
| `tests/helpers/editor-actions-test-helper.ts` | `buildEditorActionsSpies(overrides?)` (every key `vi.fn()`); `renderWithEditorActions(vnode, { actions?, scopeRoot?, container })` using `h()`/`render()`/`act()` like existing tests |

**Provider mount:** in `ProjectEditorView` ([project-editor-view.tsx:95-104](C:\Proyectos\trama\src\features\project-editor\project-editor-view.tsx)), wrapping the existing fragment, `actions={model.actions}`. `app.tsx` untouched.

## Phases (each leaves app working, tests green)

### P1 — Infra + reveal-in-file-manager vertical slice (proves the pattern)
- Create `project-editor-actions-context.tsx` + test helper; mount Provider in `project-editor-view.tsx`.
- Migrate the flow the user originally traced: `sidebar-scope-path-breadcrumb.tsx` + `use-sidebar-project-root-context-menu.ts` consume `pickProjectFolder` / `closeProject` / `revealInFileManager` via `useEditorActions()`. Leaf sketch:
  ```ts
  const { revealInFileManager } = useEditorActions()
  ```
- Delete those 3 `on*` props from the chain: `sidebar-panel.tsx`, `sidebar-panel-body.tsx`, `sidebar-explorer-content.tsx`, `sidebar-explorer-body.tsx`, `sidebar-types.ts`, and `buildSidebarProjectContextProps` in `project-editor-shell-props.ts`. (Keep `revealInFileManager` in shell actions until P2 — still backs `onRevealPathInFileManager`.)
- Tests: `tests/sidebar-panels.test.ts` renders via `renderWithEditorActions`; drop the 3 props from its `buildPanelProps()`.
- **Verify:** `npx vitest run tests/sidebar-panels.test.ts` → `npm run test` → `npm run lint`.

### P2 — File CRUD + create dialogs (introduces scoping infra)
- Create `sidebar-section-scope-context.ts` + `use-scoped-sidebar-actions.ts` (renameFile, renameFolder, deleteFile, deleteFolder, editFileTags, scoped `revealInFileManager(path)`).
- `renderExplorer` mounts `<SidebarSectionScopeProvider root={sectionConfig.root}>`; delete its scopePath CRUD wrappers. `loadFileTags`/`loadFileDeleteInfo` read root from scope context.
- Dialog hooks (`sidebar-dialog-hooks.ts`, `use-sidebar-file-actions-dialog.ts`) consume context, drop callback params. Creates are unscoped: `useEditorActions().createArticle(input, templatePath)` in `sidebar-footer-actions` chain.
- Delete `buildSidebarFileActionProps` from `project-editor-shell-props.ts` + matching `ProjectEditorShellActions` entries and memo deps in `project-editor-shell.tsx`.
- Tests: CRUD cases assert on `buildEditorActionsSpies()`; helper gains `scopeRoot`.
- **Verify:** same as P1.

### P3 — Tree/workspace actions with scoping
- Extend `use-scoped-sidebar-actions.ts`: `selectFile`, `reorderFiles`, `moveFile`, `moveFolder`. `sidebar-tree.tsx` + intermediates consume them; `sidebar-rail.tsx`/`sidebar-panel.tsx` use `useEditorActions()` for `setSidebarSection`, `toggleSidebarPanelCollapsed`. `corkboardOrder` (state) stays a prop. Delete `buildSidebarWorkspaceActionProps` remnants.
- Pre-check: grep `SidebarTree` usages — if reused outside the scope provider, keep the prop optional.
- Tests: `tests/sidebar-filter.test.ts` wraps `SidebarTree` in both providers.
- **Verify:** `npx vitest run tests/sidebar-filter.test.ts tests/sidebar-panels.test.ts` → full suite → lint.

### P4 — Project-context / transfer actions
- Migrate `saveSnapshot` and `setFocusScope` (both in `ProjectEditorActions`) in `sidebar-transfer-content.tsx` / settings chain.
- **Stay props by design:** `onImport`/`onImportZulu`/`onExport`/`onExportBook` (dialog openers from `dialogsProps`, not editor actions) and theme/spellcheck (from `app.tsx`). Optional follow-up: an `EditorDialogsContext` — out of scope.

### P5 — Dead-code deletion + docs
- Shrink/delete `useProjectEditorShellActions` + `ProjectEditorShellActions` ([project-editor-shell.tsx](C:\Proyectos\trama\src\features\project-editor\project-editor-shell.tsx)); prune `buildSidebarSectionProps`, `buildSidebarPanelBodyProps`, action groups in `sidebar-types.ts`. (`setSidebarPanelWidth` may remain — used by the layout divider, not sidebar leaves.)
- Update affected flow docs: `mds/flows/reveal-project-in-file-manager-flow.md`, `folder-delete-flow.md`, and any sidebar render/propagation flow docs.
- **Verify:** `npm run test` + `npm run lint`.

### Out of scope (documented decisions)
- Editor panes (`pane/pane-editor.tsx`, depth 4–7, pane-parameterized) — fine as-is; if ever migrated, a tiny PaneContext + `useEditorActions()`.
- Dialogs and conflict UI (depth 2–3) — no benefit.

## Risks & mitigations
- **Memo thrash:** stable facade → context never notifies; `ProjectEditorSidebarShell` memo stays effective.
- **Stale closures:** ref assigned during Provider render, before children run handlers.
- **Test churn (~40 cases in sidebar-panels.test.ts):** provider helper lands in P1; `buildPanelProps` shrinks per phase, never breaks all at once.
- **Mixed prop/context bugs:** migrate each action fully (all consumers + chain deletion) within its phase; grep the action name afterward — with one-name-end-to-end, a single grep verifies the whole chain.
- **Eslint 50/200 limits:** facade via key loop; scoped hook split into small builders.

## Verification (end-to-end)
1. After each phase: targeted vitest file(s), then `npm run test`, then `npm run lint`.
2. After P1, manual smoke via `npm run dev`: right-click project-root breadcrumb → "Show in File Explorer" opens Explorer; status bar shows "Project folder opened in file explorer."
3. After P3: create/rename/delete/move files from the sidebar in a scratch project (e.g. `example-fantasy`) across different sidebar sections (explorer vs lore) to confirm scoping still maps section-relative paths to project paths.
