# Project Index Architecture (`.trama.index.json`)

> **Created:** 2026-04-19

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

- `corkboardOrder` keys use **two different namespaces** (see "CorkboardOrder key scoping" below):
  - **Reconciliation** writes **project-relative** keys (e.g. `"outline"`, `"book/chapter-1"`).
  - **Reorder** (drag-drop) writes **section-relative** keys (e.g. `""` for section root, `"chapter-1"` for a subfolder within the active section).
  - Section-relative keys from reorder are **lost on the next reconciliation**, since no scanned file matches them as project-relative paths.
- `corkboardOrder` values currently come from **two different writers**:
  - **Reconciliation** writes **document IDs**. The ID comes from `meta.id` if present, otherwise falls back to the **project-relative file path**.
  - **Reorder** (drag-drop) currently writes the sidebar payload **as-is**. The current renderer sends **section-relative file paths**, not document IDs.
  - Reorder-written values therefore do **not** match reconciliation/book-export expectations for files with explicit `meta.id`, and even path-fallback values are section-relative rather than project-relative.
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

`corkboardOrder` keys are produced by two different code paths that use **different path scoping**:

| Source | Path scoping | Example key | Files |
|--------|-------------|-------------|-------|
| `reconcileIndex` | Project-relative (from `scanProject`) | `"book/chapter-1"`, `"outline"`, `""` | `index-service.ts:15-18` (`folderFromPath`) |
| `handleReorderFiles` | Section-relative (from sidebar tree) | `"chapter-1"`, `""` | `sidebar-panel-body.tsx:110` (no `withRoot` conversion) |

**How this happens:**
1. The sidebar scopes `visibleFiles` to section-relative paths via `getScopedFiles()` (strips the section root prefix like `"book/"`).
2. The sidebar tree is built from these section-relative paths.
3. Drag-drop reorder derives `folderPath` from `sourceRow.path` (section-relative) → `sidebar-tree.tsx:114-116`.
4. Drag-drop reorder also builds `orderedIds` from `rows.filter((r) => r.type === 'file').map((r) => r.path)` in `sidebar-tree.tsx:120-134`, which yields **section-relative file paths**.
5. The `onReorderFiles` callback in `sidebar-panel-body.tsx:110` is passed through **without** `withRoot()` conversion (unlike `onMoveFile` at line 111 which does apply `withRoot`).
6. The section-relative `folderPath` and section-relative file-path `orderedIds` are sent directly to `trama:index:reorder` IPC.

**Consequence:** reorder writes can drift from reconciliation in **both keys and values**:

- Section-relative `corkboardOrder` keys from reorder are **lost on the next reconciliation**, because `reconcileIndex` builds `next.corkboardOrder` only from project-relative folder paths (via `idsByFolder`). The section-relative key has no matching entry in `idsByFolder` and is simply dropped.
- Reorder-written values are currently **section-relative file paths**, while reconciliation and book export compare against **document IDs** (explicit `meta.id` when present, otherwise project-relative file path). For files with explicit IDs, reorder order is therefore not consumable by ID-based readers.

The `book-export-order.ts` service also uses project-relative keys (via its own `folderFromPath`), so it only reads keys that reconciliation created — not reorder keys.

## Known risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Index bloat from deleted files | Reconciliation prunes missing entries on every run |
| Split-brain (index vs filesystem) | Reconciliation always re-scans filesystem; index is rebuilt, not incrementally updated |
| Stale IDs after rename without explicit `id` | Reconciliation uses current `meta.id` or path; old path entries are pruned |
| Watcher-triggered reconciliation loop | `markInternalWrite()` prevents re-processing internal mutations |
| Corrupted index file | `loadIndex()` catches parse errors and returns a safe default |
| CorkboardOrder key/value namespace mismatch | Reorder currently writes section-relative keys and section-relative file-path values; reconciliation writes project-relative keys and document-ID values. Reorder state is therefore ephemeral until reconciliation runs, and may not be consumable by ID-based readers even before reconciliation. |
| Folder rename loses custom order | Reconciliation creates new folder key with no previous order; files appear in filesystem scan order |

## Current test coverage gap

- `tests/order-handlers.test.ts` verifies `handleReorderFiles()` when called directly with ID-shaped payloads.
- Current renderer behavior is different: `sidebar-tree.tsx` sends section-relative file paths, and there is no end-to-end test that exercises that exact payload through reorder persistence plus later reconciliation/export reads.

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
| `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` | Section-relative `onReorderFiles` pass-through (no `withRoot` conversion) |
| `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts` | `getScopedFiles()` — strips section root prefix |
| `tests/index-reconciliation.test.ts` | Reconciliation behavior tests |
