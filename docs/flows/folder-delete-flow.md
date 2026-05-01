# Folder Delete Flow

## Trigger

The user right-clicks a folder in the sidebar tree and selects "Delete", then confirms the deletion dialog.

## Entry point

`onDeleteFolder(path)` in `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` — dispatches to `actions.deleteFolder(withRoot(path))`.

## Why this flow matters

This flow involves two IPC calls, two workspace layout updates, and a snapshot refresh — all of which must produce a sidebar tree that does not include the deleted folder. A stale snapshot or a missed re-render at any point leaves a ghost folder in the tree.

## Sequence

1. **Right-click folder** — `useSidebarFolderContextMenu.handleFolderContextMenu(path, event)` stores `{ path, x, y }` in local state.

2. **Click "Delete"** — `handleDeleteFromContextMenu` calls `onOpenDelete(state.path)`.

3. **Confirmation dialog** — `useSidebarFolderActionsDialog.confirm()` calls `onDeleteFolder(targetPath)`. The path is **section-relative** (e.g. `Act-01/`).

4. **Path conversion** — `sidebar-panel-body.tsx:125` wraps the callback: `(path) => onDeleteFolder(withRoot(path))`. `withRoot` prepends `sectionConfig.root` (e.g. `book/`), producing a **project-relative** path (e.g. `book/Act-01/`).

5. **`executeFolderDelete`** in `use-project-editor-folder-actions.ts:64`:
   - Calls `window.tramaApi.deleteFolder({ path })` — backend removes the folder from disk.
   - Backend handler (`folder-handlers.ts:62`) marks deleted files as internal writes. Index reconciliation is **deferred** to `openProject` (chokidar holds a `ReadDirectoryChangesW` handle on Windows that causes stale directory listings in `scanProject`, producing `EPERM` on deleted paths — see common failure mode 5).
   - `pruneWorkspaceLayoutPathsForFolderDelete` removes paths inside the deleted folder from the workspace layout.
   - Calls `setters.setWorkspaceLayout(nextLayout)` — **first layout update, triggers re-render**.
   - Calls `openProject(values.rootPath, preferredPath, activePane)`.

6. **`openProject`** in `use-project-editor-open-project.ts:86`:
   - Calls `setters.setLoadingProject(true)`.
   - Calls `window.tramaApi.openProject({ rootPath })` — **backend rescans disk**, returns a fresh snapshot without the deleted folder.
   - Calls `applyOpenedProject`.

7. **`applyOpenedProject`** in `use-project-editor-open-project.ts:35`:
   - `setters.setRootPath(snapshot.rootPath)`
   - `setters.setSnapshot(snapshot)` — **sets new snapshot, triggers re-render**.
   - `setters.setWorkspaceLayout(reconcileWorkspaceLayout(...))` — reconciles layout against new `snapshot.markdownFiles`.

8. **`useProjectEditorState`** in `use-project-editor-state.ts:139` processes the new snapshot:
   - `visibleFiles = useMemo(() => getVisibleSidebarPaths(coreState.snapshot), [coreState.snapshot])` — walks `snapshot.tree`, collects all paths (folders with `/` suffix, files without). The deleted folder is absent.
   - `corkboardOrder = useMemo(() => coreState.snapshot?.index?.corkboardOrder ?? {}, [coreState.snapshot])` — stale order entries for deleted documents are harmless (tree builder ignores them).

9. **`buildValues`** creates `values.visibleFiles` from the memo — a flat array of project-relative paths.

10. **`buildProjectEditorModelState`** in `use-project-editor.ts:93` copies `visibleFiles` into `model.state`.

11. **`ProjectEditorView`** → `SidebarSection` → `SidebarPanel` passes `state.visibleFiles` as prop.

12. **`SidebarPanel.useSidebarPanelRenderState`** calls `useSidebarContentSection(props.sidebarActiveSection, props.visibleFiles, props.selectedPath)`:
    - `getScopedFiles(visibleFiles, sectionConfig.root)` filters paths by section root prefix and strips the prefix, producing **section-relative** paths (e.g. `book/Act-02/file.md` → `Act-02/file.md`).

13. **`SidebarPanelBody.renderExplorer`** passes `scopedFiles` as `visibleFiles` to `SidebarExplorerContent` → `SidebarExplorerBody` → `SidebarTree`.

14. **`SidebarTree.useSidebarTreeData`**:
    - `tree = useMemo(() => buildSidebarTree(visibleFiles), [visibleFiles])` — builds hierarchical tree nodes from the section-relative paths.
    - `rawRows = useMemo(() => getVisibleSidebarRows(tree, expandedFolders, ...), [tree, ...])` — flattens visible nodes into rows based on expanded folder state.
    - `rows = useMemo(() => corkboardOrder ? sortTreeRowsByOrder(rawRows, corkboardOrder) : rawRows, [rawRows, corkboardOrder])` — applies custom ordering.

15. **`SidebarTreeRows`** renders each row with `key={row.nodeId}`. The deleted folder is absent from `rows`, so its DOM node is removed.

## Reads

| Kind | Source | Why |
|------|--------|-----|
| Folder path (section-relative) | `sidebar-panel-body.tsx` prop | Passed through context menu from tree row |
| Current workspace layout | `values.workspaceLayout` | Pruned to remove paths inside deleted folder |
| Current project root | `values.rootPath` | Used to call `openProject` for fresh scan |
| Fresh snapshot | IPC `openProject` response | New scan without deleted folder |
| Section-relative files | `getScopedFiles(visibleFiles, sectionRoot)` | Scope-aware tree render |
| Expanded folder state | `useSidebarTreeExpandedFolders` hook | Preserved across tree rebuilds |

## Writes

| Kind | Target | Why |
|------|--------|-----|
| Delete folder on disk | IPC `deleteFolder` | Backend removes directory + all contents |
| Workspace layout prune | `setters.setWorkspaceLayout` | Removes open-file references to deleted content |
| Fresh snapshot | `setters.setSnapshot` | Replaces entire project tree state |
| Reconciled workspace layout | `setters.setWorkspaceLayout` (in applyOpenedProject) | Aligns layout with new markdownFiles |
| Index reconciliation | `.trama.index.json` | Happens in `openProject`, not here — chokidar handle blocks it immediately after delete |

## Side effects

- Backend: folder removed from disk, watcher marks deleted files as internal writes. Index reconciliation deferred to `openProject`.
- Renderer: workspace layout pruned, then reconciled against fresh snapshot. Status message updated.
- Expanded folder state in `useSidebarTreeExpandedFolders` is filtered to remove invalid entries via `keepValidExpanded`.

## Files to inspect

| File | Role |
|------|------|
| `src/features/project-editor/use-project-editor-folder-actions.ts` | `executeFolderDelete` — orchestrates the full flow |
| `electron/ipc/handlers/project-handlers/folder-handlers.ts` | `handleDeleteFolder` — backend deletion |
| `electron/services/project-scanner.ts` | `scanProject` — rescans disk, builds tree |
| `electron/ipc/handlers/project-handlers/project-open-handler.ts` | `handleOpenProject` — returns fresh snapshot |
| `src/features/project-editor/use-project-editor-open-project.ts` | `applyOpenedProject` — applies snapshot to state |
| `src/features/project-editor/use-project-editor-state.ts` | `getVisibleSidebarPaths` → `useMemo` chain |
| `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts` | `useSidebarContentSection` + `getScopedFiles` |
| `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` | Path conversion via `withRoot` |
| `src/features/project-editor/components/sidebar/sidebar-tree.tsx` | `useSidebarTreeData` → tree build → render |
| `src/features/project-editor/components/sidebar/sidebar-tree-logic.ts` | `buildSidebarTree`, `parseSidebarPath` |
| `src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders.ts` | Expanded folder state cleanup |

## Common failure modes

1. **Stale `visibleFiles` after snapshot update** — if `useMemo([coreState.snapshot])` doesn't recompute, the sidebar keeps the old tree. Verify with `[DEBUG useProjectEditorState]` logs.

2. **Path scoping mismatch** — `scopedFiles` passed to `SidebarTree` are section-relative (no `book/` prefix). Debug logs checking for project-relative paths like `book/Act-05/fads/` will always return false.

3. **Expanded folder state contains removed folder** — if `keepValidExpanded` doesn't filter the deleted folder, the tree builder might try to render a non-existent node. Preact would emit a warning.

4. **Watcher interference** — deleted files inside the folder trigger `unlink` events. These are marked as `internal` writes and filtered out before reaching the renderer (`ipc-runtime.ts:14`).

5. **Chokidar handle causes EPERM on Windows** — after `rm(dir, {recursive: true})`, chokidar's `ReadDirectoryChangesW` handle keeps the deleted directory entry visible to subsequent `readdir` calls. `scanProject` inside `handleDeleteFolder` sees stale entries; `readMetaByPath` then fails trying to read files that no longer exist. Fix: remove `reconcileActiveProjectIndex` from `handleDeleteFolder` entirely — index reconciliation runs inside `handleOpenProject` when `openProject` is called afterward, which calls `startWatcher` → `stop()` first, releasing all stale handles.
