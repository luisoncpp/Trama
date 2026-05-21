# Incremental Project Updates via Cached State

When optimizing file/folder mutation flows, avoid the temptation to make every backend handler "smart" about what to rescan.

## What we tried first

The initial idea was to add optional parameters to every mutation handler so the backend could do partial reconciliation. This quickly became complex: the backend had no context about which files changed unless the frontend told it, and spreading that logic across 7+ handlers duplicated the same conditional logic everywhere.

## What worked better

1. **Centralize the optimization in `openProject`** — the one endpoint the frontend already calls after every mutation.
2. **Cache the last `ProjectSnapshot` components** (`tree`, `markdownFiles`, `metaByPath`) on the backend.
3. **Pass an `incrementalUpdate` object** from the frontend to `openProject` describing what changed.
4. **Apply deltas in a pure updater function** that mutates only the cached state, reading disk only for newly created files.

## Key benefits

- **Single code path**: All mutations flow through the same `openProject → cache → incremental update → reconcileIndex` path.
- **Frontend owns the delta**: The renderer knows what it just asked the backend to do, so it can describe the change accurately.
- **Cache invalidation is trivial**: Store `rootPath` alongside the cache; if the next `openProject` has a different root, discard the cache and do a full scan.
- **Safe fallback**: If no cache exists or no `incrementalUpdate` is provided, `openProject` falls back to the existing full-scan behavior.

## When not to use this pattern

External file events (from the watcher) should **not** use incremental updates. The frontend doesn't control external mutations, so the safest path is always a full scan.

## Files

- `electron/services/project-state-cache.ts`
- `electron/services/incremental-project-updater.ts`
- `electron/ipc/handlers/project-handlers/project-open-handler.ts`
