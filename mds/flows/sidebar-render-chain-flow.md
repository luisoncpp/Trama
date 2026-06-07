# Sidebar Render Chain Flow

## Trigger

Any render of `App` (which calls `useProjectEditor()`).

## Entry point

`App` in `src/app.tsx:7` passes `model` to `ProjectEditorView`.

## Component chain

```
App (src/app.tsx)
  │ model = useProjectEditor()
  │ model.state.visibleFiles
  ▼
ProjectEditorView (src/features/project-editor/project-editor-view.tsx)
  │ SidebarSection (inline, receives model)
  │   buildSidebarSectionProps(model, ...) → { visibleFiles: state.visibleFiles, corkboardOrder, ... }
  ▼
SidebarPanel (src/.../sidebar/sidebar-panel.tsx)
  │ useSidebarPanelRenderState(props)
  │   ├─ useSidebarResponsiveCollapse()
  │   └─ useSidebarContentSection(sidebarActiveSection, visibleFiles, selectedPath)
  │        ├─ sectionConfig from SIDEBAR_SECTION_CONFIG
  │        ├─ scopedFiles = getScopedFiles(visibleFiles, sectionConfig.root)
  │        └─ scopedSelectedPath = getScopedSelectedPath(selectedPath, sectionConfig.root)
  │
  │ buildSidebarBodyProps(props, effectiveCollapsed, sectionState)
  │   scopedFiles: sectionState.scopedFiles
  ▼
SidebarPanelBody (sidebar-panel-body.tsx)
  │ if effectiveCollapsed → null
  │ if sectionConfig → renderExplorer(props)
  │   section paths enter the sidebar-path-scoping seam
  │   scopedCorkboardOrder = scopeCorkboardOrder(corkboardOrder, sectionConfig.root)
  │   scopedReorderHandler = buildScopedReorderHandler(onReorderFiles, sectionConfig.root)
  ▼
SidebarExplorerContent (sidebar-explorer-content.tsx)
  │ visibleFiles={scopedFiles}
  │ corkboardOrder={scopedCorkboardOrder}
  ▼
SidebarExplorerBody (sidebar-explorer-body.tsx)
  │ SidebarTreeArea (inline)
  │   visibleFiles={props.visibleFiles}  ← scopedFiles
  │   corkboardOrder={props.corkboardOrder}
  ▼
SidebarTree (sidebar-tree.tsx)
  │ useSidebarTreeData(visibleFiles, selectedPath, filterQuery, corkboardOrder)
  │   ├─ tree = useMemo(() => buildSidebarTree(visibleFiles), [visibleFiles])
  │   ├─ filterResult = useMemo(() => filterSidebarTree(tree, filterQuery), [filterQuery, tree])
  │   ├─ [setFolderExpanded, effectiveExpandedFolders] = useSidebarTreeExpandedFolders(tree, selectedPath, filterQuery, autoExpandFolderPaths)
  │   ├─ rawRows = useMemo(() => getVisibleSidebarRows(tree, expandedFolders, visibleNodePaths), [tree, expandedFolders, ...])
  │   └─ rows = useMemo(() => corkboardOrder ? sortTreeRowsByOrder(rawRows, corkboardOrder) : rawRows, [rawRows, corkboardOrder])
  │
  │ if visibleFiles.length === 0 && !hasFilterQuery → <p>No Markdown files.</p>
  │ if rows.length === 0 && hasFilterQuery → <p>No files match query.</p>
  │
  ▼
SidebarTreeRows (sidebar-tree.tsx:83)
  │ rows.map(row → SidebarTreeRowButton key={row.nodeId} ...)
  ▼
SidebarTreeRowButton (sidebar-tree-row-button.tsx)
  │ renders individual tree row with indent, icon, name
```

## Path transformation at each stage

| Stage | Path format | Example |
|-------|------------|---------|
| `model.state.visibleFiles` | Project-relative, folders with `/` | `book/Act-01/` |
| `useSidebarContentSection` input | Same | `book/Act-01/` |
| `getScopedFiles` output | Section-relative, strip `sectionRoot` | `Act-01/` (if section is `book/`) |
| `SidebarTree.visibleFiles` prop | Section-relative | `Act-01/` |
| `buildSidebarTree` nodeId | Normalized, no trailing `/` | `Act-01` |
| `SidebarTreeRowButton.key` | nodeId | `Act-01` |

## Key props passed to SidebarTree

| Prop | Source | Type |
|------|--------|------|
| `visibleFiles` | `scopedFiles` from `getScopedFiles` | `string[]` (section-relative) |
| `selectedPath` | `scopedSelectedPath` from `getScopedSelectedPath` | `string \| null` (section-relative) |
| `filterQuery` | `activeFilterQuery` from `useSidebarContentSection` | `string` |
| `corkboardOrder` | `scopeCorkboardOrder(global order, sectionRoot)` | `Record<string, string[]>` (section-relative keys) |

## Important: naming mismatch

In `renderExplorer` → `SidebarExplorerContent` → `SidebarExplorerBody` → `SidebarTreeArea` → `SidebarTree`, the prop is consistently named `visibleFiles`, but its value is the **section-relative** `scopedFiles`. Keep this in mind when adding debug logs in `SidebarTree` — do NOT use project-relative paths (e.g. `book/Act-05/fads/`) in `visibleFiles.includes()` checks.

## Files to inspect

| File | Role |
|------|------|
| `src/app.tsx` | Top-level model wiring |
| `src/features/project-editor/project-editor-view.tsx` | `buildSidebarSectionProps` |
| `src/.../sidebar/sidebar-panel.tsx` | `useSidebarPanelRenderState` |
| `src/.../sidebar/sidebar-panel-logic.ts` | `useSidebarContentSection`, `joinProjectPath` |
| `src/.../sidebar/sidebar-path-scoping.ts` | branded path seam: `getScopedFiles`, `getScopedSelectedPath`, `scopeCorkboardOrder`, `buildScopedReorderHandler` |
| `src/.../sidebar/sidebar-panel-body.tsx` | `renderExplorer`, raw-string adapter into the path-scoping seam |
| `src/.../sidebar/sidebar-explorer-content.tsx` | Pass-through to `SidebarExplorerBody` |
| `src/.../sidebar/sidebar-explorer-body.tsx` | `SidebarTreeArea` inline component |
| `src/.../sidebar/sidebar-tree.tsx` | `useSidebarTreeData`, `SidebarTreeRows` |
