# Drag & Drop File Reorder Implementation Plan

Date: 2026-04-17
Status: Slice 1 and Slice 2 complete
Related: `docs/START-HERE.md`, `docs/folder-rename-implementation-plan.md`, `docs/phase-4-detailed-plan.md`

## Goal

Implement drag & drop to reorder files and move files between folders in the sidebar index.

## Current Baseline

### Index Structure

- `.trama.index.json` contains `corkboardOrder: Record<folder, string[]>` where string[] is ordered list of file IDs
- `IndexService.reconcileIndex()` already preserves `corkboardOrder` during full scans
- File IDs come from `meta.id` in frontmatter, falling back to file path
- Scanner sorts alphabetically by default when no custom order exists

### Existing Sidebar Infrastructure

- `sidebar-tree.tsx` already has `onFolderContextMenu` callback
- `sidebar-types.ts` already defines `SidebarFileActions` with `onRenameFolder`
- `sidebar-panel-body.tsx` handles section-scoped path remapping
- `SidebarTreeRowButton` renders individual rows with drag handles

### Document Repository

- Already has `renameFolder`, `renameDocument`, `moveDocument` (via rename with new path)
- Path validation and project-root protection already in place

## Scope

### In Scope

- Drag a file row and drop it:
  - Between other files in the same folder (reorder)
  - On a folder row (move to that folder)
  - On a section root (move to section root)
- Visual drop indicators showing valid drop targets
- Persist order changes to `.trama.index.json`
- Maintain split-pane consistency when moving files between folders

### Out of Scope

- Dragging folders (separate feature)
- Bulk drag selection (V1 single file only)
- Drag to reorder folders (separate feature)
- Cross-section drags (book to lore) unless same root

## User-Facing Behavior

1. User drags a file row by its drag handle (left side of row)
2. Drop indicator shows valid targets:
   - Blue line between files = reorder within folder
   - Blue highlight on folder = move into folder
   - Blue line at section root = move to root
3. User drops on target
4. If moving to different folder:
   - File is renamed on disk (e.g., `old/old-name.md` → `new/new-name.md`)
   - Both panes remap if affected
5. If reordering within folder:
   - Only index order updated, no disk change
6. Sidebar refreshes with new order/position

## Proposed Architecture

### 1. IPC Contract

Add new channels for file reorder/move:

Files to update:
- `src/shared/ipc.ts`
- `electron/preload.cts`
- `src/types/trama-api.d.ts`

New channels:
```typescript
// Reorder files within a folder (no disk change)
IPC_CHANNELS.reorderFiles = 'trama:index:reorder'
reorderFilesRequestSchema = z.object({
  folderPath: z.string(), // '' for section root
  orderedIds: z.array(z.string()), // new order of file IDs
})

// Move file to new folder (disk rename)
IPC_CHANNELS.moveFile = 'trama:file:move'
moveFileRequestSchema = z.object({
  sourcePath: z.string(),
  targetFolder: z.string(), // '' for section root
})
moveFileResponseSchema = z.object({
  path: z.string(),
  renamedTo: z.string(),  // Note: property is renamedTo, not movedTo
  updatedAt: z.string(),
})
```

### 2. Index Service Update

Add methods to `electron/services/index-service.ts`:

```typescript
async updateFolderOrder(folderPath: string, orderedIds: string[]): Promise<void>
```

Implementation:
- Load current index
- Set `corkboardOrder[folderPath] = orderedIds`
- Save index
- Return success

### 3. Document Repository Update

The existing `renameDocument` can handle moves since it derives new path from directory + name.

Add helper or extend:
```typescript
async moveDocument(projectRoot: string, sourceRelativePath: string, targetFolder: string): Promise<{ path: string; renamedTo: string; updatedAt: string }>
```

Implementation:
- Validate source exists and is .md
- Derive target path: `targetFolder/sourceName.md`
- Use `renamePath()` to move on disk
- Return { path, renamedTo, updatedAt }

### 4. IPC Handler

Create `electron/ipc/handlers/project-handlers/order-handlers.ts`:

- `handleReorderFiles` - calls IndexService.updateFolderOrder
- `handleMoveFile` - calls documentRepository.moveDocument, then reconcile index

Re-export from `electron/ipc/handlers/project-handlers/index.ts`

### 5. Renderer State Management

Update `src/features/project-editor/project-editor-types.ts`:

```typescript
interface FileOrderState {
  // folderPath -> orderedIds
  customOrder: Record<string, string[]>
}

// Add to ProjectEditorState
customFileOrder: FileOrderState
```

Update `use-project-editor-state.ts`:
- Load `corkboardOrder` from index snapshot into state
- Pass order down to sidebar tree

### 6. Sidebar Drag & Drop UI

Update `src/features/project-editor/components/sidebar/sidebar-tree-row-button.tsx`:

Add:
- Drag handle icon on left side of file rows
- `draggable={true}` attribute
- `onDragStart`: store dragged file path
- `onDragOver`: calculate drop position, show indicator
- `onDrop`: call appropriate action (reorder or move)

New component: `src/features/project-editor/components/sidebar/drop-indicator.tsx`

Update `src/features/project-editor/components/sidebar/sidebar-tree.tsx`:
- Add drag state context
- Manage drop zone calculations
- Pass drag callbacks to rows

### 7. Drag & Drop Action Hook

New file: `src/features/project-editor/use-drag-drop-actions.ts`

Responsibilities:
- Handle file reorder (no disk change, just index update)
- Handle file move (disk rename + index update)
- Block move when target file exists
- Block move when source is dirty
- Update pane paths if moving affects open files

### 8. Path Remap for Split Panes

When moving a file between folders:
- If primaryPath === sourcePath → set to targetPath
- If secondaryPath === sourcePath → set to targetPath
- Use same pattern as folder rename remap

## Implementation Slices

### Slice 1: Index-only reorder (no disk change) ✅

**Status:** Complete

**Tasks:**
1. Add IPC channel `trama:index:reorder` + schemas
2. Add `IndexService.updateFolderOrder()`
3. Add `handleReorderFiles` IPC handler
4. Add drag state to sidebar tree
5. Add drop indicator UI component
6. Wire reorder flow through `sidebar-tree.tsx` → row button

**Tests:**
- `tests/order-handlers.test.ts`:
  - `handleReorderFiles` saves new order to index
  - `handleReorderFiles` handles empty folder (`''`)
  - `handleReorderFiles` rejects invalid folder path
- `tests/drag-drop-sidebar.test.ts`:
  - Drag indicator appears when dragging over valid drop zone
  - Drop between files triggers reorder IPC call
  - Order persists after project reload

---

### Slice 2: File move between folders (disk change) ✅

**Status:** Complete

**Tasks:**
1. Add IPC channel `trama:file:move` + schemas
2. Add `documentRepository.moveDocument()`
3. Add `handleMoveFile` IPC handler
4. Add `useMoveFileAction` hook in `use-project-editor-ui-actions.ts`
5. Wire move flow (drag on folder → IPC → reorder)

**Tests:**
- `tests/order-handlers.test.ts`:
  - `handleMoveFile` moves file and returns correct paths
  - `handleMoveFile` rejects target collision (file exists)
  - `handleMoveFile` rejects non-.md files
  - `handleMoveFile` rejects source file not found
- `tests/drag-drop-sidebar.test.ts`:
  - Drop on folder row triggers move IPC call
  - File actually moved on disk after drop
  - Index order preserved after move

---

### Slice 3: Split pane consistency

**Tasks:**
1. Add path remap logic in `project-editor-logic.ts`
2. Update `useMoveFileAction` to remap open pane paths
3. Reopen project preserving remapped pane targets

**Tests:**
- `tests/use-project-editor.test.ts`:
  - Moving open file to another folder remaps primary pane path
  - Moving open file to another folder remaps secondary pane path
  - Active pane preserved after move
- `tests/project-editor-logic.test.ts`:
  - `remapPathsForMove(layout, sourcePath, targetFolder)` correctly rewrites paths

---

### Slice 4: UI polish & edge cases

**Tasks:**
1. Drop indicator styling (blue line between files, blue highlight on folder)
2. Drag ghost styling (semi-transparent drag image)
3. Error messages for invalid drops
4. Handle edge cases:
   - Drop on self (no-op)
   - Drop on file that's being dragged (prevent)
   - Section root drop zone for book/outline/lore

**Tests:**
- `tests/drag-drop-sidebar.test.ts`:
  - Drop indicator hidden when over invalid target
  - Drop on self shows error or no-ops gracefully
  - Drop on section root moves file to root of section
  - Error toast shown when move blocked (collision, dirty, etc.)

## Files Created

- `electron/ipc/handlers/project-handlers/order-handlers.ts` - IPC handlers for reorder and move
- `tests/order-handlers.test.ts` - Tests for IPC handlers
- `tests/drag-drop-sidebar.test.ts` - Tests for sidebar drag-drop UI

## Files Modified

- `src/shared/ipc.ts` - Added reorderFiles and moveFile IPC channels and schemas
- `electron/preload.cts` - Exposed reorderFiles and moveFile to renderer
- `src/types/trama-api.d.ts` - Added moveFile and reorderFiles to interface
- `electron/services/document-repository.ts` - Added moveDocument() method
- `electron/ipc.ts` - Registered order handlers
- `electron/ipc/handlers/project-handlers/index.ts` - Re-exported order handlers
- `src/features/project-editor/project-editor-types.ts` - Added moveFile action
- `src/features/project-editor/use-project-editor-ui-actions.ts` - Implemented useMoveFileAction hook
- `src/features/project-editor/project-editor-view.tsx` - Wired onMoveFile prop
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx` - Added onMoveFile prop
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` - Added onMoveFile prop
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx` - Added onMoveFile prop
- `src/features/project-editor/components/sidebar/sidebar-explorer-body.tsx` - Added onMoveFile prop
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx` - Added onMoveFile prop and drag-drop logic

## Bugs Fixed During Implementation

1. **Missing export in handlers/index.ts**: `handleMoveFile` was not re-exported from the project handlers index, causing TypeScript compilation error at `electron/ipc.ts:43`.

2. **Property name mismatch**: The `moveDocument()` method returns `renamedTo` (not `movedTo`), but the handler and UI action code initially used `movedTo`. Fixed in:
   - `electron/ipc/handlers/project-handlers/order-handlers.ts:73`
   - `src/features/project-editor/use-project-editor-ui-actions.ts:169-170`

3. **Quote style mismatch in sidebar filter message**: The empty state message used single quotes (`'missing-file'`) but the test expected double quotes (`'missing-file'`). Fixed in `sidebar-tree.tsx:201`.

4. **Missing section root prefix in onMoveFile**: The sidebar tree passes paths relative to the section (e.g., `Acto-01/file.md`) but IPC expects full paths relative to project root (e.g., `book/Acto-01/file.md`). The `onMoveFile` handler in `sidebar-panel-body.tsx` was not prepending the section root prefix like other file operations do. Fixed by adding `${sectionConfig.root}` prefix to both source and target paths.

5. **Folder rows not receiving drag events**: Adding `onDragEnter` handler to `SidebarTreeRowButton` that forwards to `onDragOver` so folder rows can be valid drop targets during drag operations.

## Notes

- The `moveFile` action was integrated into `use-project-editor-ui-actions.ts` rather than a separate `use-drag-drop-actions.ts` file as originally planned.
- The `reorderFiles` action was similarly integrated rather than creating separate drag-drop action hooks.
- The `SidebarTreeRowButton` component already had drag handles from a previous implementation.

## Acceptance Criteria

1. Dragging a file row shows visual drop indicators
2. Dropping between files reorders within folder (index only)
3. Dropping on folder moves file to that folder (disk + index)
4. Split-pane open file is remapped after move
5. Order persists after project reload
6. Dirty files block move operation
7. Collision (file already exists) blocks move with error message
8. `npm run lint`, `npm run build`, and relevant tests pass