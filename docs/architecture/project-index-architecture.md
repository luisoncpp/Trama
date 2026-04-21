# Project Index Architecture (`.trama.index.json`)

> **Last updated:** 2026-04-21

## Purpose

`.trama.index.json` is a hidden project-level index file that provides two capabilities:

1. **Custom file ordering (corkboardOrder)** — user-defined display order per folder, independent of filesystem alphabetical order.
2. **Metadata cache** — per-file frontmatter snapshot used by the sidebar, corkboard, and tag resolution without re-reading every `.md` file.

## Data Model

```typescript
interface ProjectIndex {
  version: string;                       // e.g. "1.0.0"
  corkboardOrder: Record<string, string[]>;  // folder → ordered list of document IDs
  cache: Record<string, DocumentMeta>;       // relative path → frontmatter snapshot
}

interface DocumentMeta {
  id?: string;                           // explicit document ID (from frontmatter)
  type?: 'character' | 'location' | 'scene' | 'note' | 'outline';
  name?: string;
  tags?: string[];
  [key: string]: unknown;                // catch-all for arbitrary frontmatter
}
```

### Key invariants

- `corkboardOrder` keys use **project-relative** paths (e.g. `"book"`, `"book/chapter-1"`, `"outline"`).
  - Both reconciliation and reorder now write project-relative keys.
  - `scopeCorkboardOrder()` in `sidebar-panel-body.tsx` converts project-relative keys/IDs to section-relative for the sidebar tree; `buildScopedReorderHandler()` converts section-relative back to project-relative before IPC.
- `corkboardOrder` values are **project-relative file paths** (e.g. `"book/Act-01/scene-2.md"`).
  - Both reconciliation and reorder now write project-relative values.
  - For files with explicit `meta.id`, reconciliation uses the ID instead of the path; reorder always uses the project-relative path. This means reconciliation and reorder may use different identifiers for the same file when `meta.id` is present.
- `cache` keys are **project-relative file paths** (e.g. `"01_intro.md"`, `"outline/chapter-1.md"`).
- The file lives at `<projectRoot>/.trama.index.json`.
- The file watcher **ignores `.trama.index.json`** entirely (`watcher-service.ts` chokidar config). Index writes never trigger watcher events.

## File: `electron/services/index-service.ts`

### `loadIndex(): Promise<ProjectIndex>`

Reads `.trama.index.json` from the project root. Validates parsed fields: `version` must be a string (falls back to `'1.0.0'`), `corkboardOrder` and `cache` default to `{}` if absent. Returns a default empty index if the file does not exist or is unparseable:

```typescript
{ version: '1.0.0', corkboardOrder: {}, cache: {} }
```

### `saveIndex(index: ProjectIndex): Promise<void>`

Serializes the index to `.trama.index.json` with 2-space indentation.

### `reconcileIndex(markdownFiles: string[], metaByPath: Record<string, DocumentMeta>): Promise<ProjectIndex>`

This is the core function. It runs on every project open and after every file mutation (create, save, rename, delete, move).

**Algorithm:**

1. Load the current index from disk.
2. Build a new `cache` from the provided `markdownFiles` and `metaByPath`. If a file's meta is not available in the new scan, fall back to the cached value (`metaByPath[filePath] ?? current.cache[filePath] ?? {}`).
3. Build `corkboardOrder`:
   - Group all current document IDs by their folder path.
   - For each folder, take the previous order and **keep only IDs that still exist**.
   - **Append new IDs** (files not in the previous order) at the end.
4. (Dead code) A rescue loop iterates `current.cache` and re-adds entries where the path is in `existingPaths` but missing from `next.cache`. Since step 2 already adds all `markdownFiles` to `next.cache`, this condition is never satisfied and the loop is a no-op.
5. Persist the new index to disk and return it.

**Reconciliation guarantees:**

| Scenario | Behavior |
|----------|----------|
| File deleted externally | ID removed from `corkboardOrder`, entry removed from `cache` |
| File created internally | ID appended to end of folder's `corkboardOrder`, meta added to `cache` |
| File renamed | Old entry removed from `cache`, new entry added; ID preserved if `meta.id` exists |
| Folder renamed | `cache` paths updated (filesystem scan finds new paths); `corkboardOrder` old folder key entry dropped, IDs appear under new project-relative folder key in **filesystem scan order** (custom order is NOT carried over — `current.corkboardOrder[newFolderKey]` does not exist) |
| External file added (watcher) | Reconciliation appends it to `corkboardOrder` and `cache` |

## When reconciliation runs

| Trigger | Handler | Calls `reconcileIndex`? |
|---------|---------|------------------------|
| Project open | `handleOpenProject` | ✅ |
| Save document | `handleSaveDocument` | ✅ via `reconcileActiveProjectIndex` |
| Create document | `handleCreateDocument` | ✅ via `reconcileActiveProjectIndex` |
| Rename document | `handleRenameDocument` | ✅ via `reconcileActiveProjectIndex` |
| Delete document | `handleDeleteDocument` | ✅ via `reconcileActiveProjectIndex` |
| Rename folder | `handleRenameFolder` | ✅ via `reconcileActiveProjectIndex` |
| Delete folder | `handleDeleteFolder` | ✅ via `reconcileActiveProjectIndex` |
| Create folder | `handleCreateFolder` | ✅ via `reconcileActiveProjectIndex` |
| Move file | `handleMoveFile` | ✅ via `reconcileActiveProjectIndex` |
| Reorder files (drag-drop) | `handleReorderFiles` | ❌ (only updates `corkboardOrder`) |

The shared reconciliation logic lives in `electron/ipc/handlers/project-handlers/shared.ts`:

```typescript
export async function reconcileActiveProjectIndex(projectRoot: string): Promise<void>
```

This function:
1. Scans the project filesystem for all `.md` files.
2. Reads frontmatter for each file.
3. Calls `IndexService.reconcileIndex()` with the scan results.
4. Also calls `TagIndexService.buildIndex()` for tag resolution consistency.

## IPC Channels

| Channel | Request | Response | Purpose |
|---------|---------|----------|---------|
| `trama:index:get` | — | `ProjectSnapshot['index']` | Read current index |
| `trama:index:reorder` | `{ folderPath, orderedIds }` | `{ folderPath, orderedIds }` | Persist drag-drop order exactly as provided by renderer (`orderedIds` is historical naming; current renderer sends paths) |
| `trama:file:move` | `{ sourcePath, targetFolder }` | `{ path, renamedTo, updatedAt }` | Move file + reconcile |

## Internal write tracking

To prevent the file watcher from triggering reconciliation loops on internally-initiated writes, the `markInternalWrite(relativePath)` function marks `.md` file paths so the watcher classifies them as `source: 'internal'`. The `WatcherService` callback in `ipc-runtime.ts` discards internal events, preventing them from reaching the renderer.

**Timing varies by handler:**
- **Save**: `markInternalWrite(payload.data.path)` is called **before** the repository write (the path is known from the request).
- **Create / Rename / Delete / Move**: `markInternalWrite(result.path)` is called **after** the repository write (the path comes from the result).
- **Folder rename / delete**: each file in the subtree is marked individually before reconciliation.

In all cases, the mark is set **before** `reconcileActiveProjectIndex`, which ensures the watcher won't re-process the mutation.

**Example (rename document):**
```typescript
markInternalWrite(result.path)
markInternalWrite(result.renamedTo)
await reconcileActiveProjectIndex(projectRoot)
```

## ID resolution

The `idFromMeta(meta, filePath)` function determines the document ID:

1. If `meta.id` is a non-empty string → use it.
2. Otherwise → fall back to `filePath` (the relative path).

This means documents without an explicit `id` in their frontmatter use their **current project-relative path** as the fallback identifier. That fallback changes on rename, so it is only stable while the path stays unchanged.

## CorkboardOrder key scoping

`corkboardOrder` keys are now consistently **project-relative** across both writers:

| Source | Path scoping | Example key | Example values |
|--------|-------------|-------------|-------|
| `reconcileIndex` | Project-relative | `"book/chapter-1"`, `"outline"` | Document IDs (`meta.id` or project-relative path fallback) |
| `handleReorderFiles` | Project-relative | `"book/chapter-1"`, `"book"` | Project-relative file paths |

**How this works:**

1. The sidebar scopes `visibleFiles` to section-relative paths via `getScopedFiles()` (strips the section root prefix like `"book/"`).
2. The sidebar tree is built from these section-relative paths.
3. Drag-drop reorder derives `folderPath` from `sourceRow.path` (section-relative) in `use-sidebar-tree-drag-handlers.ts`.
4. `buildScopedReorderHandler()` in `sidebar-panel-body.tsx` converts section-relative `folderPath` and `orderedIds` to project-relative before calling the IPC action.
5. The project-relative `folderPath` and project-relative file-path `orderedIds` are sent to `trama:index:reorder` IPC.

**Sidebar reading path:**

6. `scopeCorkboardOrder()` in `sidebar-panel-body.tsx` converts project-relative `corkboardOrder` keys and IDs back to section-relative for the sidebar tree.
7. `sortTreeRowsByOrder()` in `sidebar-tree-sort.ts` reorders the tree rows by the scoped order.

**Remaining inconsistency:** reconciliation values use document IDs (preferring `meta.id` over path), while reorder values always use project-relative paths. For files without explicit `meta.id`, both writers use the same project-relative path and values match. For files with `meta.id`, the values differ and reconciliation overwrites reorder's path-based ordering with ID-based ordering on next run.

## Known risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Index bloat from deleted files | Reconciliation prunes missing entries on every run |
| Split-brain (index vs filesystem) | Reconciliation always re-scans filesystem; index is rebuilt, not incrementally updated |
| Stale IDs after rename without explicit `id` | Reconciliation uses current `meta.id` or path; old path entries are pruned |
| Watcher-triggered reconciliation loop | `markInternalWrite()` prevents re-processing internal mutations |
| Corrupted index file | `loadIndex()` catches parse errors and returns a safe default |
| CorkboardOrder value mismatch (meta.id vs path) | Reorder writes project-relative paths; reconciliation writes document IDs (preferring `meta.id`). For files without `meta.id` both use the same path. Reconciliation overwrites reorder values on next run, so custom order is preserved only until the next file mutation. |
| Folder rename loses custom order | Reconciliation creates new folder key with no previous order; files appear in filesystem scan order |

## Current test coverage

- `tests/order-handlers.test.ts` verifies `handleReorderFiles()` with project-relative payloads.
- `tests/sidebar-tree.test.ts` verifies `sortTreeRowsByOrder()` and `scopeCorkboardOrder()` with section-relative keys and values.
- No end-to-end test exercises the full cycle: reorder IPC with project-relative payload → index persistence → reconciliation → book-export-order read.

## Related files

| File | Role |
|------|------|
| `electron/services/index-service.ts` | Core index logic (load/save/reconcile) |
| `electron/ipc/handlers/project-handlers/index-handler.ts` | IPC handler for `trama:index:get` |
| `electron/ipc/handlers/project-handlers/order-handlers.ts` | IPC handlers for reorder + move |
| `electron/ipc/handlers/project-handlers/shared.ts` | Shared `reconcileActiveProjectIndex()` |
| `electron/ipc/handlers/project-handlers/document-handlers.ts` | Document CRUD + reconciliation calls |
| `electron/ipc/handlers/project-handlers/folder-handlers.ts` | Folder rename/delete + reconciliation calls |
| `electron/ipc/handlers/project-handlers/project-open-handler.ts` | Project open + initial reconciliation |
| `electron/ipc-runtime.ts` | Active project state + service lifecycle |
| `electron/services/watcher-service.ts` | Chokidar wrapper + internal/external write classification; ignores `.trama.index.json` |
| `electron/services/book-export-order.ts` | Book export ordering — reads project-relative `corkboardOrder` keys |
| `src/shared/ipc.ts` | Schema definitions (`projectIndexSchema`, `documentMetaSchema`) |
| `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` | `scopeCorkboardOrder()` converts project-relative → section-relative; `buildScopedReorderHandler()` converts section-relative → project-relative for reorder IPC |
| `src/features/project-editor/components/sidebar/sidebar-tree-sort.ts` | `sortTreeRowsByOrder()` — reorders tree rows by scoped `corkboardOrder` |
| `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts` | `getScopedFiles()` — strips section root prefix |
| `tests/index-reconciliation.test.ts` | Reconciliation behavior tests |
