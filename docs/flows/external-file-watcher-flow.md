# External File Watcher Flow

## Trigger

chokidar detects a file change, addition, or deletion in the project directory on disk.

## Entry point

`WatcherService` in `electron/services/watcher-service.ts` registers handlers on chokidar events (`add`, `change`, `unlink`).

## Why this flow matters

After a backend operation (file delete, folder delete, rename, move), the watcher may detect filesystem events. These events must be classified as `internal` (triggered by the app itself) vs `external` (triggered by other programs). Only `external` events are forwarded to the renderer. If internal events leak through, they can cause duplicate `openProject` calls or false conflict detection.

## Sequence

### Step A — Event detection (backend)

1. **chokidar** watches the project root for `.md` files only (line 35):
   ```typescript
   if (!absolutePath.toLowerCase().endsWith('.md')) return
   ```
   Non-markdown files and directories are ignored.

2. Event path is converted to a **project-relative** posix path (`relative`).

3. **Source classification** via `consumeSource(relativePath)` (line 75):
   - Scans `internalWrites` map for the path.
   - If found, removes it and returns `'internal'`.
   - If not found, returns `'external'`.
   - Periodically cleans up entries older than 4 seconds.

4. Event object is created:
   ```typescript
   { path: relative, event, source, timestamp }
   ```

5. Passed to `onEvent` callback (the constructor parameter).

### Step B — Event filtering (ipc-runtime)

File: `electron/ipc-runtime.ts`

6. `watcherService` callback validates the event against `externalFileEventSchema`.

7. **Source filter** (line 14):
   ```typescript
   if (!validated.success || validated.data.source !== 'external') return
   ```
   Only `source === 'external'` events are forwarded. Internal events (triggered by `markInternalWrite`) are silently dropped.

8. External events are sent to the renderer via `win.webContents.send(...)`.

### Step C — Internal write marking

9. **Any backend handler** that modifies the filesystem should call `markInternalWrite(relativePath)` for each path it changes:
   - `handleDeleteFolder`: marks all files in the deleted folder (line 78-80)
   - `handleRenameFolder`: marks old and remapped file paths (line 46-48)
   - `handleMoveFolder`: marks old and remapped file paths (line 114-117)
   - `handleRenameDocument`: marks old and new file paths
   - `handleDeleteDocument`: marks the deleted file path
   - `handleCreateDocument`: marks the new file path

10. `markInternalWrite` stores `{ path, timestamp }` in the `internalWrites` map. Entries auto-expire after 4 seconds.

### Step D — Renderer receipt

File: `electron/preload.cts:111`

11. Preload exposes `window.tramaApi.onExternalFileEvent(callback)` — returns an unsubscribe function.

File: `src/features/project-editor/use-project-editor-external-events-effect.ts`

12. Effect subscribes to events via `window.tramaApi.onExternalFileEvent(...)`.

13. On each event, `handleExternalEvent` is called:

    **If the event path matches the currently selected file:**
    - `unlink` with clean state → clears editor, calls `openProject(snapshotRootPath)` to refresh
    - `unlink` with dirty state → sets external conflict (user must resolve)
    - `add` or `change` with dirty state → sets external conflict
    - `add` or `change` with clean state → reloads the file from disk

    **If the event path doesn't match the selected file:**
    - Checks `shouldRefreshTreeOnExternalEvent(event.event)` — true for `add` and `unlink`
    - If dirty → shows "save before refresh" message
    - If clean → calls `openProject(snapshotRootPath, selectedPath)` to refresh the tree

14. The effect cleans up (unsubscribes) when the component unmounts or when dependencies change (line 122-136). The entire effect is re-subscribed if `openProject`, `loadDocument`, etc. change — which they do every render due to the non-memoized `setters` object.

## Data flow diagram

```
chokidar (filesystem)
  │
  ▼
WatcherService (classify as internal/external)
  │
  ├─ internal → markInternalWrite → consumeSource → dropped
  │
  ├─ external → onEvent callback
  │              │
  │              ▼
  │         ipc-runtime.ts
  │              │
  │              ├─ validates schema
  │              ├─ filters source !== 'external'
  │              │
  │              ▼
  │         win.webContents.send(IPC_CHANNELS.externalFileEvent, event)
  │              │
  │              ▼
  │         preload.cts → onExternalFileEvent(callback)
  │              │
  │              ▼
  │         handleExternalEvent (renderer)
  │              │
  │              ├─ path === selectedPath → conflict or reload
  │              │
  │              ├─ path !== selectedPath → tree refresh (if add/unlink)
  │              │
  │              ▼
  │         openProject(snapshotRootPath)
  │              │
  │              ▼
  │         applyOpenedProject → setSnapshot
```

## Key design decisions

1. **Only .md files trigger events** — directories are excluded. Deleting a folder with only markdown files produces `unlink` events for each file, not for the folder itself.

2. **Internal writes are time-limited** — entries expire after 4 seconds to prevent memory leaks.

3. **External events re-subscribe frequently** — the effect depends on `openProject`, `loadDocument`, etc., which change every render. This means the event listener is re-registered on every render cycle. This is wasteful but safe.

4. **Tree refresh on add/unlink** — when a non-selected file is added or removed externally, the entire project tree is refreshed via `openProject`. This call does **not** include `incrementalUpdate` parameters, so it always performs a full filesystem scan. This is intentional: external events are uncontrolled, so the safest path is to re-verify the entire filesystem state.

## Common failure modes

1. **Internal events leaking** — if `markInternalWrite` is not called or the path doesn't match the watcher path exactly (case, slashes, prefix), the event will be classified as `external` and trigger an unnecessary `openProject`. This could cause:
   - A snapshot refresh mid-operation, overwriting the intended state.
   - Duplicate `openProject` calls racing each other.

2. **Effect re-subscription loops** — since the deps array changes every render, the effect re-subscribes every render. This should be fine (unsubscribe → subscribe), but could cause missed events during the gap.

3. **Debounced renders competing with state updates** — if an external event triggers `openProject` while another `openProject` is already in-flight, both may try to `setSnapshot`. The last one wins. If the last one has a stale snapshot (e.g. before a folder delete completed), the sidebar shows old data.

## Google Drive sync false conflict prevention

When using cloud sync services like Google Drive, a file save triggers a file change event after the save completes. Due to sync delays, this can cause false conflict triggers even though no actual external edit occurred — the file on disk is identical to what was just saved.

### Solution: Saved snapshot comparison

A `lastSavedContentMap` stores the file content at the moment of each save. The map is owned by a stable ref in `useProjectEditor` and passed into `PaneWorkspace`, so it survives instance recreations:

1. **Snapshot storage** — When `markPaneSaved()` is called after a successful `savePaneIfDirty()`, the current pane content is stored in the map keyed by file path.

2. **Async comparison on external change** — When a `change` event is detected on a dirty file:
   - The conflict path is set immediately (synchronous UI feedback)
   - An async block reads the external file content via `readDocument`
   - The external content is compared against the stored snapshot using `checkExternalChangeMatchesSavedSnapshot()`
   - If contents match, the conflict is dismissed and the document is reloaded normally
   - If contents differ, the conflict panel remains visible

3. **Session scope** — The saved snapshot is stored per path and cleared:
   - On project close (when `rootPath` becomes `null` in `useProjectEditor`)
   - When explicitly overwriting by subsequent saves

**Why the map is external:** `PaneWorkspace` is recreated every render because its `useMemo` dependencies (pane state objects) change on every keystroke. If the map were internal, `destroy()` on the old instance would clear it before the external sync event arrives, causing false positives. The external ref keeps the map alive across instance lifetimes.

### Files involved in snapshot comparison

| File | Role |
|------|------|
| `src/features/project-editor/pane/pane-workspace.ts` | Receives external `lastSavedContentMap`; `getLastSavedContent()`, `checkExternalChangeMatchesSavedSnapshot()` |
| `src/features/project-editor/pane/snapshot-compare-logger.ts` | `logSnapshotComparison` — diagnostic logging for debugging mismatches |
| `src/features/project-editor/use-project-editor.ts` | Owns the stable `lastSavedContentMap` ref; clears it on project close |
| `src/features/project-editor/use-project-editor-external-events-effect.ts` | Async comparison logic in `handleExternalEvent` |

## Files to inspect

| File | Role |
|------|------|
| `electron/services/watcher-service.ts` | chokidar integration, internal/external classification |
| `electron/ipc-runtime.ts` | Event forwarding with `source !== 'external'` filter |
| `electron/ipc/handlers/project-handlers/folder-handlers.ts` | `markInternalWrite` calls for folder operations |
| `electron/preload.cts` | Renderer bridge for `onExternalFileEvent` |
| `src/features/project-editor/use-project-editor-external-events-effect.ts` | Renderer event handler, conflict detection, tree refresh |
| `src/features/project-editor/project-editor-logic.ts` | `shouldRefreshTreeOnExternalEvent` |
