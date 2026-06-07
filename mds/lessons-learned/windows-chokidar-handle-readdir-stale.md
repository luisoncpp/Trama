# Windows: chokidar handle prevents readdir from seeing deleted directories

## What I learned

In Windows, `fs.watch()` / chokidar opens a directory handle (`ReadDirectoryChangesW`) on every watched directory. This handle acts like an open file descriptor — the OS will not fully remove a deleted subdirectory entry from the parent directory listing until **all** handles to that parent directory are closed.

In practice: when chokidar watches `projectRoot/book/`, any `fs.rm` or `fs.rmdir` on a subdirectory like `book/A/` succeeds on disk, but subsequent `fs.readdir('book/')` calls may still return `A` as an entry because the chokidar handle keeps the directory metadata alive.

## Where this hit us

After `handleDeleteFolder` deleted a folder and its contents, the renderer called `handleOpenProject` to refresh the snapshot. `scanProject` → `scanDirectory` → `fs.readdir` still saw the deleted folder on the **first** IPC call. A **second** IPC call saw the correct state because the first `startWatcher` call (inside `handleOpenProject`) ran `watcher.close()`, releasing the old directory handles.

The fix in `handleOpenProject`: `await startWatcher(projectRoot)` before `await scanProject(projectRoot)` releases the stale handles before scanning. This is already in place.

**Additional fix for `handleDeleteFolder`**: The index reconciliation call was removed from `handleDeleteFolder` entirely. The sequence `rm(dir) → reconcileActiveProjectIndex` always failed on Windows because chokidar's handle kept deleted directory entries in the `readdir` listing, causing `scanProject` to traverse phantom directories and `readMetaByPath` to fail with `EPERM`. Index reconciliation now happens exclusively inside `openProject` (called by the frontend after every folder operation), which always releases handles first via `startWatcher → stop → start`.

## Key detail

- Running `scanProject` twice within the same `handleOpenProject` call did NOT fix it — because the watcher handle was never released.
- Adding a `setTimeout` delay before `scanProject` also did NOT fix it — the handle persists across async ticks.
- A second IPC call DID fix it — because the first IPC call's `startWatcher` closed the old handles before returning.

## When to watch for this

Any backend flow that:
1. Deletes or renames a directory
2. Then calls `scanProject` / `scanDirectory` to refresh the tree

Must release chokidar handles first. Either:
- Call `startWatcher(projectRoot)` before scanning (current fix), or
- Call `await watcherService.stop()` explicitly before scanning
