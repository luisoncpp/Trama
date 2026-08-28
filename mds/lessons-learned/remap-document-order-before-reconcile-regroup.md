# Remap document order before reconcile regroups folders

**Date:** 2026-08-27

## What I learned

`reconcileIndex` rebuilds `corkboardOrder` by grouping current files under `folderKeyFromDocumentPath`. After a folder rename, those keys are already the *new* paths. Looking up `current.corkboardOrder[newFolderKey]` is empty even when the old key still holds the user's **Document order**.

Remapping keys and path-valued **Order identity** entries (`remapDocumentOrder`) must run *before* that regroup. Index disk I/O can stay in `IndexService`; the remap itself belongs in `src/shared/document-order/` so export and staging do not grow a second copy of the rule.

## Why it is easy to get wrong

Incremental open already remaps `markdownFiles` and `cache` in `incremental-project-updater.ts`. That does not touch `.trama.index.json`. Treating "files already have new paths" as "order is already under the new key" drops custom order back to filesystem scan order.

## Files

- `src/shared/document-order/`
- `electron/services/index-service.ts`
- `electron/ipc/handlers/project-handlers/project-open-handler.ts`
