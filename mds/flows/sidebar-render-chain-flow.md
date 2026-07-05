# Sidebar Render Chain Flow

## Trigger

Any render of `App` (which calls `useProjectEditor()`).

## Entry point

`App` in `src/app.tsx:7` passes `model` to `ProjectEditorView`.

## State vs props split

Sidebar **state** (visible files, selected path, loading flags, git history, focus
scope, active section, corkboard order) no longer threads through the render chain as
props. It is published once by `ProjectEditorView` via `SidebarStateProvider` and read
at the leaves through `useSidebarState()` (raw, project-relative) or
`useScopedSidebarState()` (section-relative, inside a `SidebarSectionScopeProvider`).

Only these still flow as props from the shell: `effectiveCollapsed` (layout), the four
dialog openers (`onImport`, `onImportZulu`, `onExport`, `onExportBook`), theme props, and
spellcheck props.

## Component chain

```
App (src/app.tsx)
  │ model = useProjectEditor()
  ▼
ProjectEditorView (src/features/project-editor/project-editor-view.tsx)
  │ EditorActionsProvider (actions facade)
  │   SidebarStateProvider value={useMemo(buildSidebarProjectState(shellState))}
  │     — provider value identity changes only when a state field changes
  ▼
ProjectEditorSidebarShell (memo, project-editor-shell.tsx)
  │ buildSidebarSectionProps(props) → { effectiveCollapsed, ...openers, ...theme, ...spellcheck }
  │ (no per-keystroke state props → memo does not re-render while typing)
  ▼
SidebarPanel (src/.../sidebar/sidebar-panel/private/sidebar-panel.tsx)
  │ const { sidebarActiveSection } = useSidebarState()
  │ useSidebarContentSection(sidebarActiveSection) → { sectionConfig, activeFilterQuery, onFilterQueryChange }
  ├─ SidebarRail        — reads sidebarActiveSection, focusModeEnabled from context
  ▼
SidebarPanelBody (sidebar-panel-body.tsx)
  │ if effectiveCollapsed → null
  │ if sectionConfig → renderExplorer: <SidebarSectionScopeProvider root={sectionConfig.root}>
  │ else settings/transfer switch reads useSidebarState().sidebarActiveSection
  ▼
SidebarExplorerContent (sidebar-explorer-content.tsx)
  │ { title, filterQuery, onFilterQueryChange } only
  │ reads useSidebarState()/useScopedSidebarState() for controller bridge + aria-busy
  ▼
SidebarExplorerBody (sidebar-explorer-body/index.ts)
  │ const scoped = useScopedSidebarState()  → tree/expansion memos
  │ const { apiAvailable, loadingProject, statusMessage } = useSidebarState()
  ├─ SidebarScopePathBreadcrumb — reads rootPath/loadingProject/apiAvailable from context
  ├─ SidebarTreeArea — reads apiAvailable/loadingProject from context
  ▼
SidebarTree (sidebar-tree.tsx)
  │ const scoped = useScopedSidebarState()  → visibleFiles/selectedPath/corkboardOrder
  │ const { loadingDocument, loadingProject } = useSidebarState()
  ▼
SidebarTreeRows → SidebarTreeRowButton
```

## Scoped vs raw at the leaves

`useScopedSidebarState()` strips the section root (e.g. `book/`) from
`state.visibleFiles`, `state.selectedPath`, and `state.corkboardOrder` using
`getScopedFiles` / `getScopedSelectedPath` / `scopeCorkboardOrder` from
`sidebar-path-scoping.ts`. Any file list, selected path, or corkboard order consumed
inside the scope provider MUST come from `useScopedSidebarState()`; raw
`useSidebarState()` is only for booleans/flags, `rootPath`, `statusMessage`,
`sidebarActiveSection`, and the deliberately-raw `visibleFiles` used as template paths.

## Path transformation at each stage

| Stage | Path format | Example |
|-------|------------|---------|
| `state.visibleFiles` (context) | Project-relative, folders with `/` | `book/Act-01/` |
| `useScopedSidebarState()` output | Section-relative, strip `sectionRoot` | `Act-01/` (if section is `book/`) |
| `buildSidebarTree` nodeId | Normalized, no trailing `/` | `Act-01` |
| `SidebarTreeRowButton.key` | nodeId | `Act-01` |

## Files to inspect

| File | Role |
|------|------|
| `src/features/project-editor/project-editor-view.tsx` | mounts `SidebarStateProvider` |
| `src/.../sidebar/sidebar-state-context.tsx` | `SidebarProjectState`, `useSidebarState` |
| `src/.../sidebar/use-scoped-sidebar-state.ts` | `useScopedSidebarState` |
| `src/.../sidebar/sidebar-path-scoping.ts` | branded path seam: `getScopedFiles`, `getScopedSelectedPath`, `scopeCorkboardOrder` |
| `src/.../sidebar/sidebar-panel/private/sidebar-panel.tsx` | orchestrator |
| `src/.../sidebar/sidebar-panel/private/sidebar-panel-logic.ts` | `useSidebarContentSection` |
| `src/.../sidebar/sidebar-panel/private/sidebar-panel-body.tsx` | `renderExplorer` + section switch |
| `src/.../sidebar/sidebar-panel/private/sidebar-explorer-content.tsx` | explorer container |
| `src/.../sidebar/sidebar-explorer-body/sidebar-explorer-body-private/sidebar-explorer-body.tsx` | tree/filter/dialogs body |
| `src/.../sidebar/sidebar-tree.tsx` | tree rows |
