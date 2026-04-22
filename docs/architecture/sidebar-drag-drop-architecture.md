# Sidebar Drag & Drop Architecture

> **Last updated:** 2026-04-21

Goal: document the sidebar drag-and-drop system end-to-end so contributors understand the drop position model, path scoping rules, IPC contracts, and state management without tracing code across multiple files.

## Overview

The sidebar supports two drag-and-drop operations on file rows:

1. **Reorder** — drag a file row and drop it between other file rows to change their display order within a folder. Persists to `corkboardOrder` in `.trama.index.json`. No filesystem change.
2. **Move** — drag a file row and drop it onto a folder row to move the file into that folder. Moves the file on disk and reconciles the index.

Both operations use the same HTML drag-and-drop API but produce different outcomes based on the resolved `DropIndicatorPosition`.

## Drop Position Model

### Types

Defined in `src/features/project-editor/components/sidebar/drop-indicator.tsx`:

```typescript
export type DropIndicatorPosition =
  | { type: 'onFolder'; folderPath: string }
  | { type: 'between'; beforeIndex: number }
```

| Type | Trigger | Operation |
|------|---------|-----------|
| `onFolder` | User drags over a folder row | **Move** — file moves into the target folder |
| `between` | User drags between file rows | **Reorder** — files are reordered within the folder |

### Calculation

`calculateDropPosition()` in `use-sidebar-tree-drag-handlers.ts` resolves the drop target:

1. Find the `closestRow` above the cursor's midpoint (`clientY < rect.top + rect.height / 2`)
2. If `closestRow` is a folder → return `onFolder` with that folder's path
3. Otherwise → return `between` with `closestRow`'s index in the rows array

The rows passed to `calculateDropPosition` are already sorted by `corkboardOrder` (via `sortTreeRowsByOrder`), so the resolved `beforeIndex` reflects the user's intended insertion position.

## Data Flow

### Reorder (in-index ordering)

```
User drags file
  → calculateDropPosition(type: 'between', beforeIndex)
  → executeDrop() [use-sidebar-tree-drag-handlers.ts]
    → builds sibling file list (rows already sorted by corkboardOrder)
    → splice source out, insert at target index
    → calls onReorderFiles(folderPath, orderedIds)

onReorderFiles [use-project-editor-ui-actions.ts]
  → window.tramaApi.reorderFiles({ folderPath, orderedIds })
  → handleReorderFiles [electron/ipc/handlers/project-handlers/order-handlers.ts]
    → IndexService.updateFolderOrder()
    → persist to .trama.index.json
  → openProject(rootPath)  [use-project-editor-ui-actions.ts]
    → refreshes snapshot including corkboardOrder
    → sidebar re-renders with new order
```

### Move (filesystem move)

```
User drags file onto folder
  → calculateDropPosition(type: 'onFolder', folderPath)
  → executeDrop() [use-sidebar-tree-drag-handlers.ts]
    → calls onMoveFile(sourcePath, targetFolder)

onMoveFile [use-project-editor-ui-actions.ts]
  → window.tramaApi.moveFile({ sourcePath, targetFolder })
  → handleMoveFile [electron/ipc/handlers/project-handlers/order-handlers.ts]
    → DocumentRepository.moveDocument()
    → reconcileActiveProjectIndex()
  → openProject(rootPath)
    → refreshes tree and index
```

## Path Scoping for Reorder vs Move

Both operations originate in the sidebar tree (section-relative paths) but differ in how they convert to project-relative paths for IPC.

### Reorder — `buildScopedReorderHandler()`

`corkboardOrder` keys in the index are **project-relative** (e.g., `book/Act-01`, `book`). The sidebar tree works with **section-relative** paths (e.g., `Act-01`).

**Reading (index → tree):**

```
snapshot.index.corkboardOrder (project-relative keys + values)
  → scopeCorkboardOrder(order, sectionConfig.root) [sidebar-panel-body.tsx]
    → strips section root prefix from keys
    → strips folder prefix from file IDs within each key
  → scopedCorkboardOrder { '': [...], 'Act-01': [...] }
  → sortTreeRowsByOrder(rows, scopedCorkboardOrder) [sidebar-tree-sort.ts]
    → reorders direct child files within each expanded folder
```

**Writing (tree → IPC):**

```
executeDrop() builds section-relative sibling file list
  → buildScopedReorderHandler(onReorderFiles, withRoot, sectionRoot) [sidebar-panel-body.tsx]
    → converts folderPath: '' → sectionRoot.replace(/\/+$/, '')
    → converts folderPath: 'Act-01' → sectionRoot + 'Act-01'
    → converts orderedIds: each id → withRoot(id)
  → IPC: { folderPath: 'book/Act-01', orderedIds: ['book/Act-01/scene-b.md', ...] }
```

### Move — `withRoot()`

Move uses project-relative paths for filesystem operations. The conversion is simpler:

```typescript
// sidebar-panel-body.tsx
onMoveFile={onMoveFile ? (s, t) => onMoveFile(withRoot(s), withRoot(t)) : undefined}
```

Both `sourcePath` and `targetFolder` are prepended with `sectionConfig.root`.

## IPC Contract

### Reorder

```
trama:index:reorder
Request:  { folderPath: string, orderedIds: string[] }
Response: { folderPath: string, orderedIds: string[] }
```

- `folderPath`: **project-relative** folder key (e.g., `book/Act-01` or `book` for section root)
- `orderedIds`: **project-relative** file paths in the new order
- Handler: `handleReorderFiles` in `electron/ipc/handlers/project-handlers/order-handlers.ts`
- Effect: persists `corkboardOrder[folderPath] = orderedIds` in `.trama.index.json`

### Move (file)

```
trama:file:move
Request:  { sourcePath: string, targetFolder: string }
Response: { path: string, renamedTo: string, updatedAt: string }
```

- `sourcePath`: **project-relative** file path being moved
- `targetFolder`: **project-relative** destination folder path (or `''` for section root)
- Handler: `handleMoveFile` in `electron/ipc/handlers/project-handlers/order-handlers.ts`
- Effect: moves file on disk, reconciles index

### Move (folder)

```
trama:folder:move
Request:  { sourcePath: string, targetParent: string }
Response: { sourcePath: string, renamedTo: string, updatedAt: string }
```

- `sourcePath`: **project-relative** folder path being moved
- `targetParent`: **project-relative** destination parent folder path (or `''` for section root)
- Handler: `handleMoveFolder` in `electron/ipc/handlers/project-handlers/folder-handlers.ts`
- Effect: moves folder subtree on disk, marks internal writes for all affected files, reconciles index

#### Folder move data flow

```
User drags folder onto another folder / section root
  → calculateDropPosition(type: 'onFolder' | 'onSection')
  → executeDrop() [use-sidebar-tree-drag-handlers.ts]
    → if folder source + onFolder → onMoveFolder(sourcePath, targetPath)
    → if folder source + onSection → onMoveFolder(sourcePath, '')

onMoveFolder [use-project-editor-folder-actions.ts]
  → dirty-subtree guard
  → window.tramaApi.moveFolder({ sourcePath, targetParent })
  → handleMoveFolder [folder-handlers.ts]
    → DocumentRepository.moveFolder()
    → reconcileActiveProjectIndex()
  → remapWorkspaceLayoutPathsForFolderRename()
  → openProject(rootPath)
    → refreshes tree and index
```

## Drag State Management

Drag state lives in `SidebarTree` component state:

```typescript
const [draggingPath, setDraggingPath] = useState<string | null>(null)
const [dropPosition, setDropPosition] = useState<DropIndicatorPosition | null>(null)
```

This state is passed down to `SidebarTreeRows` via `dragState` prop and consumed by `useSidebarTreeDragHandlers`. The state is intentionally local to the tree — no global state or IPC notification.

## Component Hierarchy

```
SidebarTree
├── SidebarTreeRows
│   ├── SidebarTreeRowButton (per row, draggable)
│   │   └── onDragStart → handleDragStart
│   │   └── onDragOver → handleDragOver
│   │   └── onDrop → handleDrop
│   └── DropIndicator (positioned overlay)
└── useSidebarTreeDragHandlers
    ├── calculateDropPosition()
    └── executeDrop()
```

`SidebarTreeRows` is a pure render component. All drag logic lives in `useSidebarTreeDragHandlers`.

## Key Files

| File | Responsibility |
|------|---------------|
| `src/features/project-editor/components/sidebar/use-sidebar-tree-drag-handlers.ts` | `calculateDropPosition()`, `executeDrop()`, drag handler hook |
| `src/features/project-editor/components/sidebar/sidebar-tree-sort.ts` | `sortTreeRowsByOrder()` — reorders rows by corkboardOrder |
| `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` | `scopeCorkboardOrder()`, `buildScopedReorderHandler()` — path scoping boundary |
| `src/features/project-editor/components/sidebar/sidebar-tree.tsx` | `SidebarTree`, `SidebarTreeRows`, drag state |
| `src/features/project-editor/components/sidebar/sidebar-tree-row-button.tsx` | Row rendering, drag event attachment |
| `src/features/project-editor/components/sidebar/drop-indicator.tsx` | `DropIndicatorPosition` types |
| `src/features/project-editor/use-project-editor-ui-actions.ts` | `useReorderFilesAction()`, `useMoveFileAction()` |
| `src/features/project-editor/use-project-editor-folder-actions.ts` | `useProjectEditorFolderActions` (rename, delete, move) |
| `electron/ipc/handlers/project-handlers/order-handlers.ts` | `handleReorderFiles`, `handleMoveFile` |
| `electron/ipc/handlers/project-handlers/folder-handlers.ts` | `handleRenameFolder`, `handleDeleteFolder`, `handleMoveFolder` |
| `electron/services/index-service.ts` | `IndexService.updateFolderOrder()` |

## Slices

| Slice | Status | Description |
|-------|--------|-------------|
| Drag-drop file reorder | ✅ Done | Drag file between rows → persist to corkboardOrder |
| corkboardOrder integration | ✅ Done | Tree reads index order; reorder uses project-relative paths |
| Drag-drop file move | ✅ Done (Slice 2) | Drag file onto folder → move on disk |
| Folder move IPC + repository | ✅ Done (Slice 2) | `trama:folder:move`, `DocumentRepository.moveFolder()`, renderer action |
| Folder drag-drop UI wiring | ✅ Done (Slice 3) | Drag folder onto folder/section root → move subtree |
| Cross-section folder move | ❌ Not planned | Moving folders between book/lore/outline roots |

## Focused Tests

```
npm run test -- tests/corkboard-order-integration.test.ts
npm run test -- tests/corkboard-order-persistence.test.ts
npm run test -- tests/drag-drop-sidebar.test.ts
npm run test -- tests/order-handlers.test.ts
npm run test -- tests/folder-move-repository.test.ts
npm run test -- tests/folder-move-ipc-handler.test.ts
npm run test -- tests/sidebar-panel-body.test.ts
```

## Extension Points

### Adding a new drop target type

1. Add the type to `DropIndicatorPosition` in `drop-indicator.tsx`
2. Update `calculateDropPosition()` to detect the new target
3. Update `executeDrop()` to route to the new operation
4. Add a new IPC channel if needed

### Adding drag to folder rows

Folder rows are now draggable. The implementation:
1. `SidebarTreeRowButton` sets `draggable={true}` for all rows
2. `executeDrop()` detects `sourceRow.type === 'folder'` and routes to `onMoveFolder`
3. `DropIndicator` supports `onSection` for section-root drop targets
4. Container-level `onDragOver`/`onDrop` handlers detect drops on empty space below rows and route to section-root move

## See Also

- `docs/architecture/sidebar-path-scoping-model.md` — path scoping rules and conversion functions
- `docs/architecture/project-index-architecture.md` — `corkboardOrder` data model and reconciliation
- `docs/plan/sidebar-drag-drop-reorder-folder-move-plan.md` — implementation plan and slice tracking
- `docs/lessons-learned/index-reorder-payload-id-vs-path.md` — why reorder uses paths not IDs
