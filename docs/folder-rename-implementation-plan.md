# Folder Rename Implementation Plan

Date: 2026-04-15
Status: Planned
Related: `docs/START-HERE.md`, `docs/phase-4-detailed-plan.md`, `docs/lessons-learned/sidebar-path-scoping.md`, `docs/split-pane-coordination.md`

## Goal

Implement folder rename from the sidebar with the same safety level as existing file operations:

- Rename a folder from the sidebar context menu.
- Rename the directory on disk.
- Preserve tree usability after refresh.
- Keep index/tag state consistent.
- Avoid split-pane regressions when open documents live under the renamed folder.

This document covers only **folder rename**. Folder delete and move remain separate slices.

## Why a Dedicated Plan

`docs/phase-4-detailed-plan.md` already reserves WS2 for folder operations, but that section is intentionally broad and partially outdated against the current codebase. In the real implementation today:

- Filesystem mutations live in `electron/services/document-repository.ts`, not `electron/services/repo-service.ts`.
- Folder create already exists end-to-end via `createFolder`.
- File rename/delete already follow the pattern `IPC -> repository -> full reconcile -> renderer reopen`.
- Sidebar paths are section-scoped in the UI and project-relative in IPC, which is a known source of bugs.

Folder rename should be implemented as a focused vertical slice that reuses those existing patterns instead of introducing a second architecture.

## Current Baseline

### Backend

- `electron/services/document-repository.ts`
  - Already validates path segments and name segments.
  - Already supports `createFolder`, `renameDocument`, and `deleteDocument`.
- `electron/ipc/handlers/project-handlers/document-handlers.ts`
  - Already does payload validation, repository call, `markInternalWrite`, and full index/tag reconcile.
- `electron/services/project-scanner.ts`
  - Produces a tree that includes folders, including empty folders.
- `electron/services/watcher-service.ts`
  - Only classifies internal writes per markdown file path.
  - A folder rename will surface as multiple `unlink/add` events for contained `.md` files.

### Renderer

- `src/features/project-editor/use-project-editor-state.ts`
  - Converts `snapshot.tree` into sidebar paths, adding a trailing `/` for folder rows.
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx`
  - Supports right-click only for file rows today.
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx`
  - Correctly remaps section-local sidebar paths back to project-relative paths for file actions.
- `src/features/project-editor/use-project-editor-file-actions.ts`
  - File rename/delete use `window.tramaApi` and then reopen the project.
- `src/features/project-editor/project-editor-logic.ts`
  - Reconcile logic understands preferred file restore, but not prefix remapping for both panes after a folder rename.

## Scope

### In Scope

- Rename folder from sidebar context menu in `book/`, `outline/`, and `lore/` sections.
- Rename a directory to a new sibling name only.
- Preserve existing subtree contents.
- Full project refresh after rename.
- Open-pane path remapping for files under the renamed folder.
- Expanded-folder state remapping for the renamed subtree.
- Index/tag refresh through the existing reconcile pipeline.

### Out of Scope

- Folder delete.
- Folder move / reparent.
- Drag and drop.
- Cross-root moves.
- Bulk rewrite of links/content inside markdown files.

## User-Facing Behavior

1. User right-clicks a folder row in the sidebar.
2. Context menu shows `Rename`.
3. Rename dialog accepts a new folder name segment only.
4. Confirming renames the directory on disk.
5. Sidebar refreshes and keeps the renamed subtree visible.
6. If the active pane or secondary pane had a file inside that folder, both panes reopen the remapped file paths.
7. If rename is invalid or collides with an existing path, the UI shows the backend error.

## Safety Rules

### Path and naming rules

- Accept only a single new segment, never a nested path.
- Reuse the same validation rules already applied by `validateNameSegment()`.
- Reject no-op renames.
- Reject collisions when the destination folder already exists.
- Keep project-root escape protection identical to existing repository methods.

### Dirty editor rule for V1

V1 should **block folder rename when any open dirty pane path is inside the folder prefix**.

Reason:

- Folder rename can invalidate multiple loaded pane paths at once.
- There is no generic confirmation flow for “several dirty files inside subtree” yet.
- Blocking is safer than attempting partial remap of unsaved editor state.

Recommended message:

- `Save or wait for autosave before renaming a folder that contains open unsaved files.`

This can be relaxed later if a subtree-level confirmation flow is added.

## Proposed Architecture

### 1. IPC contract

Add a dedicated folder rename contract.

Files:

- `src/shared/ipc.ts`
- `electron/preload.cts`
- `src/types/trama-api.d.ts`

Add:

- `IPC_CHANNELS.renameFolder = 'trama:folder:rename'`
- `renameFolderRequestSchema = z.object({ path: z.string().trim().min(1), newName: z.string().trim().min(1) })`
- `renameFolderResponseSchema = z.object({ path: z.string(), renamedTo: z.string(), updatedAt: z.string() })`

Type exports should mirror the existing `renameDocument` contract.

### 2. Repository layer

Extend `electron/services/document-repository.ts` with:

- `renameFolder(projectRoot: string, relativePath: string, newName: string)`

Implementation rules:

- Validate `relativePath` with `validateRelativePath()`.
- Validate `newName` with `validateNameSegment()`.
- Resolve sibling destination using `path.posix.dirname()`.
- Reject no-op rename.
- Ensure destination does not exist.
- Use `fs.rename()` on the directory.
- Return `{ path, renamedTo, updatedAt }`.

No separate repository service is needed for V1.

### 3. IPC handler

Because `electron/ipc/handlers/project-handlers/document-handlers.ts` is already near the lint ceiling, the cleanest path is:

- Create `electron/ipc/handlers/project-handlers/folder-handlers.ts`
- Re-export from `electron/ipc/handlers/project-handlers/index.ts`
- Register from `electron/ipc.ts`

Handler responsibilities:

- Validate payload.
- Call `documentRepository.renameFolder(...)`.
- Mark internal writes for affected markdown files.
- Reconcile index and tag index via the existing full-scan helper.
- Return a standard envelope.

### 4. Watcher strategy

Folder rename is not a single markdown write; it is a subtree move. The watcher currently classifies internal writes one file path at a time.

V1 plan:

- Before renaming, collect markdown files under the old folder prefix from the current project snapshot or a fresh scan.
- Derive their future paths by replacing the old prefix with the renamed prefix.
- Call `markInternalWrite()` for both old and new relative file paths.

This avoids emitting false external conflict prompts when the OS reports subtree `unlink/add` events.

Do not stop and restart the watcher just for rename in V1 unless the per-file internal-marking approach proves flaky in tests.

### 5. Renderer action layer

Create a dedicated folder action hook instead of overloading file actions.

New file:

- `src/features/project-editor/use-project-editor-folder-actions.ts`

Update:

- `src/features/project-editor/project-editor-types.ts`
- `src/features/project-editor/use-project-editor-ui-actions.ts`
- `src/features/project-editor/project-editor-view.tsx`

Responsibilities:

- Validate input similarly to file rename.
- Block when a dirty open pane is inside the folder prefix.
- Call `window.tramaApi.renameFolder(...)`.
- Reopen the project root after success.
- Preserve both pane targets by remapping affected paths before reopen.
- Set user-facing status messages.

### 6. Path remap helper for split panes

Add a small pure helper near `project-editor-logic.ts` for prefix remap.

Suggested helpers:

- `isPathInsideFolder(path, folderPath)`
- `remapFolderPrefix(path, oldFolderPath, newFolderPath)`
- `remapWorkspaceLayoutPathsForFolderRename(layout, oldFolderPath, newFolderPath)`

Behavior:

- If `primaryPath` starts with the renamed folder prefix, rewrite it.
- If `secondaryPath` starts with the renamed folder prefix, rewrite it.
- Preserve `activePane`.
- Let normal reopen reconciliation handle any path that no longer exists.

This is the most important gap missing from the broad WS2 plan.

### 7. Sidebar UX

Folder rows need their own context-menu path.

Update:

- `src/features/project-editor/components/sidebar/sidebar-tree.tsx`
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx`
- `src/features/project-editor/components/sidebar/sidebar-types.ts`

New files:

- `src/features/project-editor/components/sidebar/sidebar-folder-context-menu.tsx`
- `src/features/project-editor/components/sidebar/sidebar-folder-actions-dialog.tsx`
- `src/features/project-editor/components/sidebar/use-sidebar-folder-context-menu.ts`
- `src/features/project-editor/components/sidebar/use-sidebar-folder-actions-dialog.ts`

Rationale for separate folder components:

- File actions already include `Edit tags`, which is file-specific.
- Folder rename/delete flows have different validation and messaging.
- Keeping them separate reduces conditional complexity and helps stay under lint limits.

### 8. Section-path remapping

Keep the existing pattern from `docs/lessons-learned/sidebar-path-scoping.md`:

- Tree rows remain section-relative in the sidebar.
- `sidebar-panel-body.tsx` remaps folder action callbacks back to project-relative paths.
- Do not duplicate path-joining logic inside context menu hooks or dialog hooks.

This is a required guardrail, not an implementation detail.

### 9. Expanded-folder state continuity

Folder rename should not collapse the whole subtree after refresh if the renamed folder was expanded.

Update:

- `src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders.ts`

Add a small prefix-remap step so expanded folder entries under `oldFolderPath` become `newFolderPath/...` before invalid paths are discarded.

Without this, rename will technically work but feel broken in normal use.

## Implementation Slices

### Slice 1: backend contract and filesystem rename

- Add IPC channel, schemas, preload bridge, and typings.
- Add `renameFolder()` in `document-repository.ts`.
- Add `folder-handlers.ts` with internal write marking and reconcile.
- Add focused unit tests for repository and IPC handler behavior.

### Slice 2: renderer actions and reopen remap

- Add folder rename action hook.
- Add folder-prefix remap helpers for pane/layout paths.
- Reopen project while preserving remapped pane targets.
- Add tests for split-pane preservation.

### Slice 3: sidebar UX

- Add folder context menu.
- Add rename dialog.
- Wire section-relative folder paths through panel composition.
- Add tests for right-click folder rename in explorer/outline/lore.

### Slice 4: hardening

- Remap expanded folder state.
- Add watcher/internal-write regression coverage.
- Run manual checks for empty folders and nested trees.

## Tests

### Backend tests

Add:

- `tests/folder-rename-repository.test.ts`
- `tests/folder-rename-ipc-handler.test.ts`

Cases:

- Rename simple folder.
- Rename nested folder.
- Reject empty name.
- Reject path separator in `newName`.
- Reject collision with existing sibling folder.
- Reject no-op rename.
- Reconcile index after rename.

### Renderer/sidebar tests

Add or extend:

- `tests/sidebar-panels.test.ts`
- `tests/use-project-editor.test.ts`
- `tests/project-editor-logic.test.ts`

Cases:

- Right-click folder row opens folder rename flow.
- Section-scoped folder path is remapped back to project-relative path.
- Renaming folder preserves primary pane file when it lived under the renamed subtree.
- Renaming folder preserves secondary pane file when split mode is active.
- Dirty pane inside subtree blocks rename with status message.
- Expanded folder state is preserved across rename refresh.

### Watcher regression tests

Add:

- `tests/folder-rename-watcher-regression.test.ts`

Cases:

- Internal subtree rename does not surface as external conflict events for contained markdown files.

## Manual Verification

1. Create `book/Act-01/Chapter-01/` with multiple scenes and rename `Chapter-01` to `Chapter-02`.
2. Verify the renamed folder stays visible and its files remain selectable.
3. Open one affected file in primary and another in secondary, rename the parent folder, and verify both panes reopen the remapped paths.
4. Try rename while one affected pane is dirty and verify the action is blocked safely.
5. Rename an empty folder and confirm it remains visible in the tree.
6. Verify no external-change banner appears because of the internal folder rename.

## Acceptance Criteria

1. Right-clicking a folder row exposes a rename action.
2. Renaming a folder updates the real directory on disk.
3. The project refreshes without losing index or tag consistency.
4. Split-pane open files inside the renamed subtree are remapped correctly.
5. Expanded folder state is preserved for the renamed subtree.
6. Dirty open files inside the subtree block the operation in V1.
7. No false external-change conflict is shown for the internal rename.
8. `npm run lint`, `npm run build`, and relevant tests pass.

## Recommended File List

### Create

- `electron/ipc/handlers/project-handlers/folder-handlers.ts`
- `src/features/project-editor/use-project-editor-folder-actions.ts`
- `src/features/project-editor/components/sidebar/sidebar-folder-context-menu.tsx`
- `src/features/project-editor/components/sidebar/sidebar-folder-actions-dialog.tsx`
- `src/features/project-editor/components/sidebar/use-sidebar-folder-context-menu.ts`
- `src/features/project-editor/components/sidebar/use-sidebar-folder-actions-dialog.ts`
- `tests/folder-rename-repository.test.ts`
- `tests/folder-rename-ipc-handler.test.ts`
- `tests/folder-rename-watcher-regression.test.ts`

### Modify

- `src/shared/ipc.ts`
- `electron/ipc.ts`
- `electron/preload.cts`
- `src/types/trama-api.d.ts`
- `electron/services/document-repository.ts`
- `electron/ipc/handlers/project-handlers/index.ts`
- `src/features/project-editor/project-editor-types.ts`
- `src/features/project-editor/project-editor-logic.ts`
- `src/features/project-editor/use-project-editor-ui-actions.ts`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx`
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx`
- `src/features/project-editor/components/sidebar/sidebar-explorer-body.tsx`
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
- `src/features/project-editor/components/sidebar/sidebar-types.ts`
- `src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders.ts`
- `tests/sidebar-panels.test.ts`
- `tests/use-project-editor.test.ts`
- `tests/project-editor-logic.test.ts`

## Notes for the Implementing PR

- Keep the implementation as a rename-only slice; do not mix delete/move into the same PR.
- Prefer full reconcile after rename over clever incremental index edits.
- Reuse the same backend validation rules already trusted by file rename/create.
- Treat watcher suppression and split-pane path remap as first-class requirements, not polish.