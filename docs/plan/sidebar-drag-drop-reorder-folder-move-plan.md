# Sidebar Drag & Drop: Reorder + Folder Move Plan

Date: 2026-04-20
Status: In progress
Related: `docs/plan/drag-drop-file-reorder-plan.md`, `docs/live/current-status.md`, `docs/START-HERE.md`

## Goal

Two pending items:
1. **(A)** Integrate `corkboardOrder` into sidebar tree so reorder operations read/write actual index order (not alphabetical).
2. **(B)** Implement folder drag-and-drop so users can move folders between sections/parents.

## Background

### Item A — corkboardOrder not integrated in sidebar tree

`buildSidebarTree` in `sidebar-tree-logic.ts` sorts children alphabetically (lines 139-143). It never reads `corkboardOrder` from the index snapshot. This means:

- The sidebar shows files in alphabetical order regardless of custom order.
- Drag-drop reorder currently builds `orderedIds` from `rows.filter((r) => r.type === 'file').map((r) => r.path)` in `use-sidebar-tree-drag-handlers.ts:83`, which is the visible (alphabetical) order — not the persisted index order.
- The result: reorder works visually but doesn't actually apply custom order from the index.

**Fix needed:**
- Pass `corkboardOrder: Record<string, string[]>` from the index snapshot to the sidebar tree.
- `buildSidebarTree` or a new sort step must apply `corkboardOrder` before returning rows.
- `use-sidebar-tree-drag-handlers.ts` must build `orderedIds` from the sorted-by-index rows, not the raw filtered rows.
- Path scoping: `corkboardOrder` keys in the index are project-relative (e.g., `outline`, `lore/places`). The sidebar works with section-relative paths (e.g., `places` when in `lore` section). Conversion must happen before passing to IPC.

**Reorder IPC payload stays path-based** (not IDs) — this avoids the ID/path drift issue documented in `docs/lessons-learned/index-reorder-payload-id-vs-path.md`. `meta.id` exists in the schema but is not used by reorder and will be removed in a future cleanup.

### Item B — Folder move not implemented

No IPC channel exists for moving a folder on disk. `document-repository.ts` has `renameFolder` but no `moveFolder`. Moving a folder requires:
1. Renaming the folder path on disk (all nested file paths change too).
2. Updating `.trama.index.json` (file cache paths change, `corkboardOrder` keys may change).
3. Remapping open pane paths if any affected file is open in split panes.

This is more complex than file move because the subtree moves.

## Scope

### Item A: corkboardOrder integration

**In scope:**
- Wire `corkboardOrder` from snapshot → sidebar tree.
- Sort tree rows by `corkboardOrder` before rendering.
- Fix `use-sidebar-tree-drag-handlers.ts` to build reorder payload from sorted rows.
- Handle path-scoping conversion (project-relative key ↔ section-relative path).
- Add section-relative `''` for section root reorder.

**Out of scope:**
- Changing the IPC contract (path-based payload stays).
- Eliminating `meta.id` from the schema (deferred).

### Item B: Folder drag-and-drop

**In scope:**
- Add IPC channel `trama:folder:move`.
- Add `documentRepository.moveFolder()`.
- Add `handleMoveFolder` IPC handler.
- Add renderer action `moveFolder` in `use-project-editor-ui-actions.ts`.
- Wire drag-drop on folder rows → `onMoveFolder` callback.
- Split pane path remapping for moved folder subtree.
- Drop indicator for folder move (reuse existing `onFolder` indicator type).

**Out of scope:**
- Moving a folder across sections that share the same root (book ↔ lore ↔ outline cross-moves).
- Moving a folder into the root of a different section.
- Bulk folder move (V1 single folder only).
- Nested folder move performance optimization (deferred if subtree is large).

## User-Facing Behavior

### Item A

1. User opens a project with files that have custom order (or creates order via drag-drop).
2. Sidebar shows files in the order stored in `corkboardOrder`, not alphabetical.
3. User drags a file between two other files → reorder payload reflects the `corkboardOrder`-sorted list.
4. After drop, sidebar continues to show correct order.

### Item B

1. User drags a folder row by its drag handle.
2. Valid drop targets: another folder (same section), section root.
3. Drop indicator shows valid targets (blue highlight on folder, blue line at section root).
4. On drop: folder and all its contents move on disk, index reconciles, sidebar refreshes.
5. If any affected file is open in a pane, pane path remaps to new location.

## Proposed Architecture

### Item A — corkboardOrder Integration

#### 1. Pass order to sidebar tree

Update `SidebarTreeProps` to accept `corkboardOrder`:

```typescript
// sidebar-tree.tsx
export interface SidebarTreeProps {
  // ...existing
  corkboardOrder?: Record<string, string[]>  // NEW
}
```

State management: `use-project-editor-state.ts` already has `visibleFiles` from `snapshot.tree`. Add `corkboardOrder` from `snapshot.index.corkboardOrder`.

#### 2. Sort rows by corkboardOrder before rendering

In `sidebar-tree-logic.ts`, add a sort function:

```typescript
export function sortTreeRowsByOrder(
  rows: SidebarTreeRow[],
  corkboardOrder: Record<string, string[]>
): SidebarTreeRow[]
```

Logic:
- Group rows by parent folder (or section root for top-level files).
- For each group, apply `corkboardOrder[folderKey]` if present.
- Files not in `corkboardOrder` fall back to current position.
- Folders retain their relative order.

**Path scoping note:** `corkboardOrder` uses project-relative keys (e.g., `outline`, `lore/places`). Section-relative conversion happens at the caller (`sidebar-panel-body.tsx`) before passing to the tree component.

#### 3. Fix reorder payload source

In `use-sidebar-tree-drag-handlers.ts`, `handleDrop`:

Current (broken):
```typescript
const reorderedIds = rows.filter((r) => r.type === 'file').map((r) => r.path)
```

Fixed:
```typescript
// rows is already sorted by corkboardOrder at this point
const reorderedIds = rows.filter((r) => r.type === 'file').map((r) => r.path)
```

The rows passed to the hook must already be in index-sorted order (not alphabetical).

#### 4. Path scoping for IPC payload

`corkboardOrder` keys are project-relative (e.g., `outline`, `lore/places`). The reorder IPC sends `folderPath` as part of the payload. Currently the handler derives `folderPath` from the source file path:

```typescript
// use-sidebar-tree-drag-handlers.ts:80-82
const folderPath = sourceRow.path.includes('/')
  ? sourceRow.path.split('/').slice(0, -1).join('/')
  : ''
```

This produces section-relative paths (e.g., `Act-01` not `outline/Act-01`). The IPC handler needs project-relative keys.

Fix: prepend the section root prefix in `sidebar-panel-body.tsx` before passing to IPC, similar to how `onMoveFile` was fixed (see `docs/plan/drag-drop-file-reorder-plan.md` bug #4).

#### 5. Test scenarios

- Project loads with `corkboardOrder['outline'] = ['scene-b', 'scene-a']` → sidebar shows scene-b before scene-a (not alphabetical).
- Drag scene-a between two others → reorder payload reflects current `corkboardOrder`-sorted list.
- After drop, order persists and sidebar shows new order.
- After project reload, order is still correct.

---

### Item B — Folder Drag & Drop

#### 1. IPC Contract

```typescript
// src/shared/ipc.ts
IPC_CHANNELS.moveFolder = 'trama:folder:move'
moveFolderRequestSchema = z.object({
  sourcePath: z.string().trim().min(1),   // project-relative folder path with trailing /
  targetParent: z.string(),               // project-relative parent path or '' for section root
})
moveFolderResponseSchema = z.object({
  sourcePath: z.string(),
  renamedTo: z.string(),
  updatedAt: z.string(),
})
```

#### 2. Document Repository

```typescript
// electron/services/document-repository.ts
async moveFolder(
  projectRoot: string,
  sourceFolder: string,   // e.g., 'outline/Act-01'
  targetParent: string    // e.g., 'outline' or ''
): Promise<{ sourcePath: string, renamedTo: string, updatedAt: string }>
```

Implementation:
- Validate source exists and is a folder.
- Derive target: `targetParent/sourceFolderName` (e.g., `outline/Act-02` if moving `Act-01` into `outline`).
- Use `fs.rename` to move the folder on disk (all nested paths update automatically on most OS).
- Return `{ sourcePath, renamedTo, updatedAt }`.

#### 3. IPC Handler

```typescript
// electron/ipc/handlers/project-handlers/folder-handlers.ts
export async function handleMoveFolder(rawPayload: unknown): Promise<IpcEnvelope<MoveFolderResponse>> {
  // validates payload
  // calls documentRepository.moveFolder()
  // marks internal writes
  // reconciles active project index
  // returns envelope response
}
```

#### 4. Index Reconciliation Impact

After moving a folder:
- All file cache entries in `index.cache` that were under `sourceFolder/*` need path updates.
- `corkboardOrder` entries whose keys start with `sourceFolder/` need key remapping.
- Simplest approach: full reconciliation after move handles all path updates.

#### 5. Split Pane Path Remapping

```typescript
// In moveFolder action or project-editor-logic.ts
function remapPanePathsForFolderMove(
  layout: WorkspaceLayoutState,
  sourceFolder: string,
  targetFolder: string
): WorkspaceLayoutState
```

Logic (same pattern as folder rename remap):
- For each pane path, if it starts with `sourceFolder/`, replace prefix with `targetFolder/`.
- If path === `sourceFolder` (folder itself open in pane), remap to `targetFolder`.

#### 6. Sidebar UI Wiring

Update `SidebarTreeRowButton` (which already has drag handles for files) to handle folder drag:

```typescript
// use-sidebar-tree-drag-handlers.ts
const handleDrop = async (filePath: string, _event: DragEvent) => {
  // Existing: onFolder → onMoveFile
  // New: detect sourceRow.type === 'folder' → onMoveFolder
}
```

Update drop position calculation to allow dropping folders onto other folders (same as file move logic).

#### 7. Test scenarios

- Drag folder A onto folder B → folder A moves into folder B.
- Drag folder A onto section root → folder A moves to section root.
- Open file from folder A, then move folder A → pane path remaps to new location.
- Dirty file blocks folder move (same as file move guard).
- Collision (target folder already exists) blocks move with error.

## Implementation Slices

### Slice 1: corkboardOrder integration ✅ (done)

**Tasks:**
1. Add `corkboardOrder` to `SidebarTreeProps` and thread through sidebar component chain.
2. Add `sortTreeRowsByOrder()` in `sidebar-tree-logic.ts`.
3. Fix `use-sidebar-tree-drag-handlers.ts` to use already-sorted rows.
4. Fix section-relative → project-relative path conversion for reorder IPC payload.
5. Add tests for sidebar tree sorted by `corkboardOrder`.

---

### Slice 2: Folder move IPC + repository ✅ (planned)

**Tasks:**
1. Add `moveFolder` IPC channel + schemas to `src/shared/ipc.ts`.
2. Add `moveFolder` to `electron/preload.cts` and `src/types/trama-api.d.ts`.
3. Add `documentRepository.moveFolder()` method.
4. Add `handleMoveFolder` IPC handler in `electron/ipc/handlers/project-handlers/folder-handlers.ts`.
5. Add `moveFolder` action in `use-project-editor-ui-actions.ts`.

**Tests:**
- `tests/folder-handlers.test.ts` or `tests/order-handlers.test.ts`:
  - `handleMoveFolder` moves folder and returns correct paths.
  - `handleMoveFolder` rejects non-folder source.
  - `handleMoveFolder` rejects target collision.
  - `handleMoveFolder` rejects source not found.

---

### Slice 3: Folder move UI wiring ✅ (planned)

**Tasks:**
1. Wire `onMoveFolder` prop through sidebar component chain.
2. Update `use-sidebar-tree-drag-handlers.ts` to call `onMoveFolder` when source is a folder and drop target is valid.
3. Add split pane path remapping after folder move.
4. Add drag handle to folder rows (if not already present).

**Tests:**
- `tests/drag-drop-sidebar.test.ts`:
  - Drag folder onto another folder triggers move IPC call.
  - Drag folder onto section root triggers move IPC call.
  - Folder and contents actually moved on disk after drop.
  - Split pane path remaps correctly after folder move.

---

## Files to Create

- `tests/folder-handlers.test.ts` (or extend existing order/folder handlers test file)

## Files to Modify

### Item A (corkboardOrder integration):

- `src/features/project-editor/components/sidebar/sidebar-tree.tsx` — accept `corkboardOrder` prop, sort rows
- `src/features/project-editor/components/sidebar/sidebar-tree-logic.ts` — add `sortTreeRowsByOrder()`
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` — pass `corkboardOrder` with path scoping
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx` — thread `corkboardOrder` prop
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx` — thread `corkboardOrder` prop
- `src/features/project-editor/components/sidebar/sidebar-explorer-body.tsx` — thread `corkboardOrder` prop
- `src/features/project-editor/components/sidebar/use-sidebar-tree-drag-handlers.ts` — use sorted rows for reorder payload
- `src/features/project-editor/use-project-editor-state.ts` — derive `corkboardOrder` from snapshot
- `src/features/project-editor/use-project-editor.ts` — pass `corkboardOrder` to sidebar
- `tests/sidebar-tree.test.ts` — add sorted order tests

### Item B (folder move):

- `src/shared/ipc.ts` — add `moveFolder` channel and schemas
- `electron/preload.cts` — expose `moveFolder`
- `src/types/trama-api.d.ts` — add `moveFolder` to interface
- `electron/services/document-repository.ts` — add `moveFolder()` method
- `electron/ipc/handlers/project-handlers/folder-handlers.ts` — add `handleMoveFolder`
- `electron/ipc/handlers/project-handlers/index.ts` — re-export `handleMoveFolder`
- `electron/ipc.ts` — register `handleMoveFolder`
- `src/features/project-editor/project-editor-types.ts` — add `moveFolder` to actions
- `src/features/project-editor/use-project-editor-ui-actions.ts` — add `useMoveFolderAction`
- `src/features/project-editor/project-editor-view.tsx` — wire `onMoveFolder`
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx` — add `onMoveFolder` prop
- `src/features/project-editor/components/sidebar/sidebar-tree-row-button.tsx` — ensure folder rows are draggable
- `src/features/project-editor/components/sidebar/use-sidebar-tree-drag-handlers.ts` — handle folder drag-drop
- `src/features/project-editor/components/sidebar/drop-indicator.tsx` — folder drop highlight (reuse `onFolder` type)
- `tests/drag-drop-sidebar.test.ts` — folder move tests

## Acceptance Criteria

### Item A
1. Files in sidebar appear in `corkboardOrder` order (not alphabetical) when order is set.
2. Drag-drop reorder builds payload from `corkboardOrder`-sorted rows.
3. Reorder persists to index and sidebar reflects it after project reload.
4. `npm run lint`, `npm run build`, and tests pass.

### Item B
1. Dragging a folder onto another folder moves it.
2. Dragging a folder onto section root moves it to root.
3. Open file in moved folder remaps pane path correctly.
4. Dirty file in folder blocks move with error.
5. `npm run lint`, `npm run build`, and tests pass.
