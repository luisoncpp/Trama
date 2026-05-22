# Incremental Project Update Plan

> **Status:** Implemented (all phases complete).
> **Goal:** Avoid full project rescans when a file or folder is created, deleted, renamed, or moved.

## Problem Statement

Every file/folder mutation currently triggers **two full disk rescans**:

1. The mutation handler (`handleCreateDocument`, `handleRenameFolder`, etc.) calls `reconcileActiveProjectIndex()`, which runs `scanProject()` + `readMetaByPath()` for **all** `.md` files.
2. The frontend then calls `openProject()`, which runs `scanProject()` + `readMetaByPath()` **again**.

For large projects, this is the primary performance bottleneck when renaming or moving folders.

## Solution Overview

Add optional **incremental update** parameters to the `openProject` IPC endpoint. The backend caches the last `ProjectSnapshot` components (`tree`, `markdownFiles`, `metaByPath`). When `openProject` is called with incremental params, it mutates the cached state instead of rescanning the disk. It only reads meta for files that actually changed.

This eliminates the second full scan. We also remove the redundant `reconcileActiveProjectIndex` call from most mutation handlers (the index gets reconciled inside `openProject` instead).

## Key Design Decisions

### 1. Cache Invalidation on Root Path Change

The backend cache is scoped to a specific project root. **If `openProject` is called with a different `rootPath`, the cache must be fully invalidated and a full scan must run.** This handles the case where the user opens a different project, or the same folder from a different path (symlinks, different drive letters on Windows, etc.).

### 2. Only `openProject` Gets Incremental Params

Per the user's direction, only the `openProject` endpoint receives the optional incremental update payload. All mutation handlers simply perform the filesystem operation and return; the frontend is responsible for calling `openProject` with the correct incremental parameters afterward.

### 3. `reconcileActiveProjectIndex` Is Reduced to Save-Only

`handleSaveDocument` does not trigger `openProject` on the frontend, so it must still reconcile the index. It will call `reconcileActiveProjectIndex(projectRoot, { changedFiles: [payload.data.path] })` so only the saved file's meta is re-read. All other handlers no longer call `reconcileActiveProjectIndex`.

### 4. `handleDeleteFolder` Stays As-Is

`handleDeleteFolder` already skips `reconcileActiveProjectIndex` due to a chokidar/Windows `EPERM` issue. It will continue to rely on `openProject` for refresh. The frontend will pass `deletedFolders` to `openProject`.

## Phases

### Phase 1: Backend — Add Incremental Update Support to `openProject`

**1.1. Add backend state cache.**

Create a `project-state-cache.ts` module that stores:
- `lastRootPath: string`
- `lastTree: TreeItem[]`
- `lastMarkdownFiles: string[]`
- `lastMetaByPath: Record<string, DocumentMeta>`

Expose:
- `setProjectCache(rootPath, tree, markdownFiles, metaByPath)` — called after every full scan.
- `getProjectCache(rootPath)` — returns the cached data **only if the provided `rootPath` matches `lastRootPath`**. Returns `null` otherwise, forcing a full scan.

**1.2. Add incremental update types to IPC schema.**

Update `src/shared/ipc.ts`:

```typescript
const incrementalUpdateSchema = z.object({
  createdFiles: z.array(z.string()).optional(),
  deletedFiles: z.array(z.string()).optional(),
  renamedFiles: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  createdFolders: z.array(z.string()).optional(),
  deletedFolders: z.array(z.string()).optional(),
  renamedFolders: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
}).optional()

export const openProjectRequestSchema = z.object({
  rootPath: z.string().trim().min(1),
  incrementalUpdate: incrementalUpdateSchema,
})
```

**1.3. Create `incremental-project-updater.ts`.**

A pure service that takes cached state + incremental changes and returns updated state:

- **`updateMarkdownFiles(markdownFiles, changes)`**: add created, remove deleted, apply renames.
- **`updateMetaByPath(metaByPath, changes, projectRoot)`**: remove deleted entries, move renamed entries, read frontmatter only for created/renamed files using `DocumentRepository.readDocument`.
- **`updateTree(tree, changes)`**: Mutate the nested `TreeItem` structure:
  - File create → find/create parent folders, add file node.
  - File delete → remove file node.
  - File rename → remove old, add new.
  - Folder create → add empty folder node.
  - Folder delete → remove subtree.
  - Folder rename → rename node, recursively update all descendant `id`/`path` values.

**1.4. Update `handleOpenProject`.**

```typescript
// Pseudocode
const cache = getProjectCache(payload.data.rootPath)
if (payload.data.incrementalUpdate && cache) {
  const updated = applyIncrementalUpdate(cache, payload.data.incrementalUpdate, projectRoot)
  setProjectCache(projectRoot, updated.tree, updated.markdownFiles, updated.metaByPath)
  const indexService = getActiveIndexService() ?? new IndexService(projectRoot)
  const index = await indexService.reconcileIndex(updated.markdownFiles, updated.metaByPath)
  return { ok: true, data: { rootPath: projectRoot, tree: updated.tree, markdownFiles: updated.markdownFiles, index } }
} else {
  // Full scan (existing logic)
  const { tree, markdownFiles } = await scanProject(projectRoot)
  const metaByPath = await readMetaByPath(projectRoot, markdownFiles)
  setProjectCache(projectRoot, tree, markdownFiles, metaByPath)
  // ... rest unchanged
}
```

**1.5. Update `reconcileActiveProjectIndex` in `shared.ts`.**

Currently it always rescans. Change it to accept optional `{ changedFiles?: string[] }` and use the cache when available:
- If cache exists and `changedFiles` is provided: update only those files' meta in `lastMetaByPath`, then call `indexService.reconcileIndex`.
- Otherwise: fall back to full scan.

### Phase 2: Backend — Remove Redundant Full Rescans from Mutation Handlers

**2.1. Remove `reconcileActiveProjectIndex` from these handlers.**

- `handleCreateDocument`
- `handleCreateFolder`
- `handleRenameDocument`
- `handleRenameFolder`
- `handleDeleteDocument`
- `handleMoveFile`
- `handleMoveFolder`

These handlers now only: validate, perform the filesystem operation, mark internal writes, and return. The index reconciliation happens when the frontend calls `openProject`.

**2.2. Keep incremental reconciliation for `handleSaveDocument`.**

`saveDocument` does not trigger `openProject` on the frontend, so it must still reconcile the index. Update it to call:
```typescript
await reconcileActiveProjectIndex(projectRoot, { changedFiles: [payload.data.path] })
```
so only the saved file's meta is re-read.

**2.3. `handleDeleteFolder` stays unchanged.**

Already skips `reconcileActiveProjectIndex`. No change needed.

### Phase 3: Frontend — Pass Incremental Params to `openProject`

Update every post-mutation `openProject` call in `src/features/project-editor/sidebar-file-actions/private/` to include `incrementalUpdate`:

| Action | Old call | New `incrementalUpdate` |
|--------|----------|------------------------|
| `createArticle` | `openProject(root, newPath)` | `{ createdFiles: [newPath] }` |
| `createCategory` | `openProject(root)` | `{ createdFolders: [newPath] }` |
| `renameFile` | `openProject(root, newPath)` | `{ renamedFiles: [{ from: old, to: new }] }` |
| `deleteFile` | `openProject(root)` | `{ deletedFiles: [path] }` |
| `renameFolder` | `openProject(root, preferredPath)` | `{ renamedFolders: [{ from: old, to: new }] }` |
| `deleteFolder` | `openProject(root, preferredPath)` | `{ deletedFolders: [path] }` |
| `moveFile` | `openProject(root, newPath)` | `{ renamedFiles: [{ from: source, to: target }] }` |
| `moveFolder` | `openProject(root, preferredPath)` | `{ renamedFolders: [{ from: source, to: target }] }` |
| `reorderFiles` | `openProject(root)` | **No change** (no fs mutation, optimize later) |

The `openProject` callback signature in `use-project-editor-open-project.ts` needs to accept the optional param and forward it to the IPC call.

### Phase 4: Tests

**4.1. Unit tests for `incremental-project-updater.ts`.**

- Create a fixture tree with nested folders and files.
- Test each operation type (create/delete/rename file/folder) in isolation.
- Assert tree structure, `markdownFiles`, and `metaByPath` are correct.
- Test that renamed folders update all descendant paths.
- Test that created files inside non-existent folders auto-create parent folder nodes.

**4.2. Integration tests for `handleOpenProject` with incremental params.**

- Open a project (full scan, populates cache).
- Create a file externally.
- Call `handleOpenProject` with `{ incrementalUpdate: { createdFiles: [...] } }`.
- Assert response tree contains the new file.
- Assert `.trama.index.json` is updated without rescanning.

**4.3. Regression tests.**

- Ensure `openProject` without `incrementalUpdate` still does a full scan.
- Ensure `openProject` with a **different** `rootPath` invalidates the cache and does a full scan.
- Ensure existing test suite passes (`npm run test`).

### Phase 5: Same-Folder Move Optimization

When a file is reordered within the same folder (only `corkboardOrder` changes, no filesystem path change), `reorderFiles` now passes `incrementalUpdate: {}` to `openProject`. This triggers the cache path without any filesystem mutation, skipping the full scan and re-reading only the index from disk.

**Implementation:** One-line change in `file-move.ts` — `await deps.openProject(deps.rootPath, { incrementalUpdate: {} })`.

### Phase 6: Consolidate Existing Indexes

Added `IndexService.updateCache(changedFiles, metaByPath)` which updates only `cache` entries without rebuilding `corkboardOrder`. `reconcileActiveProjectIndex` now uses `updateCache` when `changedFiles` is provided (e.g., after `handleSaveDocument`), making save operations avoid the full `reconcileIndex` rebuild.

## Files to Create / Modify

| File | Action | Reason |
|------|--------|--------|
| `electron/services/project-state-cache.ts` | Create | Cache for tree, markdownFiles, metaByPath |
| `electron/services/incremental-project-updater.ts` | Create | Pure logic to mutate cached state |
| `src/shared/ipc.ts` | Modify | Add `incrementalUpdateSchema` to `openProjectRequestSchema` |
| `electron/ipc/handlers/project-handlers/project-open-handler.ts` | Modify | Branch between full scan and incremental update |
| `electron/ipc/handlers/project-handlers/shared.ts` | Modify | `reconcileActiveProjectIndex` accepts optional `changedFiles` |
| `electron/ipc/handlers/project-handlers/document-handlers.ts` | Modify | Remove `reconcileActiveProjectIndex` from create/rename/delete/move |
| `electron/ipc/handlers/project-handlers/folder-handlers.ts` | Modify | Remove `reconcileActiveProjectIndex` from create/rename/move |
| `electron/ipc/handlers/project-handlers/order-handlers.ts` | Modify | Remove `reconcileActiveProjectIndex` from `handleMoveFile` |
| `src/features/project-editor/use-project-editor-open-project.ts` | Modify | Forward `incrementalUpdate` to IPC |
| `src/features/project-editor/sidebar-file-actions/private/file-create.ts` | Modify | Pass `createdFiles` to `openProject` |
| `src/features/project-editor/sidebar-file-actions/private/file-crud.ts` | Modify | Pass `renamedFiles`/`deletedFiles` to `openProject` |
| `src/features/project-editor/sidebar-file-actions/private/file-move.ts` | Modify | Pass `renamedFiles` to `openProject` |
| `src/features/project-editor/sidebar-file-actions/private/folder-crud.ts` | Modify | Pass `renamedFolders`/`deletedFolders`/`createdFolders` to `openProject` |
| `tests/incremental-project-updater.test.ts` | Create | Unit tests for pure updater logic |
| `tests/incremental-open-project.test.ts` | Create | Integration tests for cached `openProject` |
| `electron/services/index-service.ts` | Modify | Add `updateCache` for cache-only updates |
| `docs/plan/incremental-project-update-plan.md` | Create | This document |

## Related Documents

- `docs/architecture/project-index-architecture.md`
- `docs/flows/project-state-propagation-flow.md`
- `docs/flows/folder-delete-flow.md`
- `docs/flows/external-file-watcher-flow.md`
