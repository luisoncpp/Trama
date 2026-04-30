# Visible Files Computation Flow

## Trigger

Any state setter that updates `coreState.snapshot` — typically from `applyOpenedProject` in the open-project flow.

## Entry point

`useProjectEditorState()` in `src/features/project-editor/use-project-editor-state.ts:139`.

## Why this flow matters

`visibleFiles` is the single source of truth for what the sidebar tree displays. It is computed from `coreState.snapshot` via `useMemo` and propagated through 7+ component layers before reaching the tree render. A stale computation or a broken propagation chain leaves the sidebar showing phantom folders.

## Sequence

### Step A — State computation

1. `useProjectEditorCoreState()` (in `use-project-editor-core-state.ts:6`) exposes `snapshot` via `useState<ProjectSnapshot | null>(null)`. When `setSnapshot(snapshot)` is called, the `snapshot` reference changes.

2. `useProjectEditorState()` de-structures `coreState.snapshot` and passes it as the **only dependency** to a `useMemo`:
   ```
   visibleFiles = useMemo(() => getVisibleSidebarPaths(coreState.snapshot), [coreState.snapshot])
   ```
   Preact compares the current `coreState.snapshot` against the previous stored dependency. If the references differ (`!==`), the callback runs; otherwise the cached array is returned.

3. `getVisibleSidebarPaths(snapshot)` (same file, line 66):
   - Returns `[]` if `snapshot` is falsy.
   - Recursively walks `snapshot.tree` (an array of `TreeItem[]`).
   - Folder items → pushes `\`${item.path}/\`` and recurses into `item.children ?? []`.
   - File items → pushes `item.path` directly.
   - Returns a flat `string[]` of **project-relative** paths (e.g. `book/Act-01/`, `book/Act-01/chapter.md`).

4. `corkboardOrder` is computed from the same snapshot with a parallel `useMemo`:
   ```
   corkboardOrder = useMemo(() => coreState.snapshot?.index?.corkboardOrder ?? {}, [coreState.snapshot])
   ```

### Step B — Values object assembly

5. `buildValues(params)` (same file, line 85) copies `visibleFiles` and `corkboardOrder` into the returned `ProjectEditorStateValues` object. This object is **not memoized** — it is recreated every render.

6. `useProjectEditorState()` returns `{ values, setters }`.

### Step C — Model object assembly

7. `useProjectEditor()` in `use-project-editor.ts:93` calls `buildProjectEditorModelState(values)`:
   ```
   visibleFiles: values.visibleFiles,
   corkboardOrder: values.corkboardOrder,
   ```
   This creates `model.state`.

### Step D — Component propagation

8. `App` passes `model` to `ProjectEditorView`.

9. `ProjectEditorView.sidebarSection` calls `buildSidebarSectionProps(model, ...)`:
   ```
   visibleFiles: state.visibleFiles,
   corkboardOrder: state.corkboardOrder,
   ```

10. `SidebarPanel` receives both as props.

11. `SidebarPanel.useSidebarPanelRenderState` calls `useSidebarContentSection(sidebarActiveSection, visibleFiles, selectedPath)`.

### Step E — Section scoping

12. `useSidebarContentSection` in `sidebar-panel-logic.ts:36`:
    - Selects `sectionConfig` from `SIDEBAR_SECTION_CONFIG` (e.g. `{ title: 'Manuscript', root: 'book/' }`).
    - Calls `getScopedFiles(visibleFiles, sectionConfig.root)`:
      1. Normalizes backslashes to forward slashes.
      2. Filters paths that start with `sectionConfig.root` (e.g. keeps `book/Act-01/file.md`, drops `lore/places/city.md`).
      3. Strips the section root prefix from remaining paths (e.g. `book/Act-01/file.md` → `Act-01/file.md`).
      4. Filters out empty strings.
    - Returns these **section-relative** paths as `scopedFiles`.

13. `renderExplorer` (in `sidebar-panel-body.tsx:103`) passes `visibleFiles={scopedFiles}` to `SidebarExplorerContent`.

### Step F — Tree build

14. `SidebarExplorerContent` → `SidebarExplorerBody` → `SidebarTreeArea` → `SidebarTree` (prop name remains `visibleFiles` throughout, but the value is section-relative).

15. `SidebarTree.useSidebarTreeData` in `sidebar-tree.tsx:45`:
    - `tree = useMemo(() => buildSidebarTree(visibleFiles), [visibleFiles])`:
      - `parseSidebarPath(rawPath)` normalizes slashes, detects folder type by trailing `/`, strips the suffix.
      - Iterates segments to build parent folder chain via `ensureFolderNode`.
      - Appends file nodes via `ensureFileNode`.
      - Sorts children alphabetically (folders before files).
    - `filterResult = useMemo(() => filterSidebarTree(tree, filterQuery), [filterQuery, tree])`
    - `rawRows = useMemo(() => getVisibleSidebarRows(tree, expandedFolders, visibleNodePaths), [tree, expandedFolders, ...])`
    - `rows = useMemo(() => corkboardOrder ? sortTreeRowsByOrder(rawRows, corkboardOrder) : rawRows, [rawRows, corkboardOrder])`

### Step G — Render

16. `SidebarTreeRows` renders each `row` with `key={row.nodeId}`. Preact reconciles the VDOM: removed nodes are unmounted, new nodes are mounted, existing nodes are updated.

## Data shapes at each stage

| Stage | Example path | Context |
|-------|-------------|---------|
| `getVisibleSidebarPaths` returns | `book/Act-01/` | Project-relative, folder with trailing `/` |
| `getVisibleSidebarPaths` returns | `book/Act-01/scene.md` | Project-relative, file without `/` |
| `getScopedFiles` produces | `Act-01/` | Section-relative (root `book/` stripped) |
| `getScopedFiles` produces | `Act-01/scene.md` | Section-relative |
| `buildSidebarTree.nodeId` | `Act-01` | Path without trailing `/`, used as node key |
| `SidebarTreeRow.nodeId` | same as above | Used as React `key` prop |
| `corkboardOrder` keys | `book/Act-01` (project-relative) → scoped to `Act-01` via `scopeCorkboardOrder` | Section-relative keys |

## Key memoization boundaries

| Hook | Deps | Recomputes when |
|------|------|-----------------|
| `useMemo` for `visibleFiles` | `[coreState.snapshot]` | Snapshot reference changes |
| `useMemo` for `corkboardOrder` | `[coreState.snapshot]` | Same as above |
| `useMemo` for `tree` | `[visibleFiles]` | Section-relative paths array changes |
| `useMemo` for `filterResult` | `[filterQuery, tree]` | Tree or filter query changes |
| `useMemo` for `rawRows` | `[effectiveExpandedFolders, filterResult, tree]` | Tree, filter, or expansion state |
| `useMemo` for `rows` | `[rawRows, corkboardOrder]` | Raw rows or ordering changes |

## Common failure modes

1. **`useMemo` doesn't trigger** — if `coreState.snapshot` is the same object reference (e.g. if `setSnapshot` is called with the old object), `useMemo` returns the cached `visibleFiles`. Verify with `[DEBUG useProjectEditorState]` log on line 145: it prints every time `coreState.snapshot` changes. If it prints but `visibleFiles` is unchanged, check `getVisibleSidebarPaths`.

2. **`getVisibleSidebarPaths` returns stale data** — the function walks `snapshot.tree` synchronously. If `snapshot.tree` still contains the deleted folder, the backend returned a stale tree.

3. **Path scoping returns empty** — `getScopedFiles` only keeps paths starting with `sectionConfig.root`. If the tree data uses a different root prefix (e.g. `manuscript/` instead of `book/`), the sidebar will show an empty tree.

4. **Section-relative vs project-relative confusion in debug logs** — the `[DEBUG sidebarTree]` log in `sidebar-tree.tsx:46` checks `visibleFiles.includes('book/Act-05/fads/')` but `visibleFiles` at that point is **section-relative** (no `book/` prefix). This check always returns false. Use section-relative paths in debug logs at that stage.
