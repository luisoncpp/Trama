# Rich Editor Revert Changes Flow

## Trigger

User clicks the "Revertir cambios" (revert changes) button in the editor toolbar.

## Entry point

`revertChanges(pane?)` action in `use-project-editor-ui-actions-helpers.ts`, wired via `useRevertChangesAction`.

## Why this flow matters

This is the only path where the user intentionally **discards** unsaved edits and reloads the file from disk. It differs from the external-sync flow in two critical ways:

- External sync usually decides to apply or skip based on canonical equivalence. Revert still **always** reloads from disk and now carries an explicit force-apply signal for text-identical reloads.
- File selection (`selectFile`) saves dirty content before switching. Revert **does not save** — it discards deliberately.

## Guard condition

The revert only proceeds if:
1. `isDirty === true` — there are unsaved changes worth reverting
2. The pane has a `path` — a file is loaded (you cannot revert an empty pane)

When these conditions are not met, the action returns immediately without calling `loadDocument`.

## Sequence

1. User clicks the revert button in the toolbar (`.ql-revert-changes`).
2. `onclick` fires `onRevertNow`, which calls `actions.revertChanges(pane)`.
3. `revertChanges` determines the target pane:
   - If `pane` argument is provided → use that pane (split mode, explicit routing)
   - If `pane` is omitted → use `workspace.layout.activePane`
4. Guard check: `workspace.preparePaneRevert(targetPane)` returns `{ kind: 'no-op' }` when `!isDirty || !path`.
5. If guard passes: `preparePaneRevert` flushes live editor content and returns `{ kind: 'reverted', path }`.
6. `flushPaneContent()` cancels any pending debounce timer and snapshots the live Quill DOM while the current editor instance is still mounted.
7. `revertChanges` then calls `loadDocument(path, targetPane)`.
9. `loadDocument` sets `loadingDocument = true`.
10. `loadDocument` calls `window.tramaApi.readDocument({ path })` via IPC `trama:document:read`.
11. The main process handler reads the file from disk (`document-repository.ts`).
12. The response envelope carries `{ path, content, meta }`.
13. `stripBase64ImagesFromMarkdown(content, path)` extracts base64 images into the in-memory cache, replacing them with `<!-- IMAGE_PLACEHOLDER:... -->` markers.
14. `paneWorkspace.loadPaneDocument(targetPane, path, markdownWithoutImages, meta)` is called:
    - Sets `isDirty: false` on the target pane
    - Updates the pane's content with the clean disk version
    - Updates the pane's meta from disk
15. `loadPaneDocument()` increments the pane's `reloadVersion`.
16. `EditorPanel` passes that value through as `forceApplyVersion` to `RichMarkdownEditor`.
17. `useSyncExternalValue()` treats a newer `forceApplyVersion` as an explicit disk-reload intent and re-applies the disk markdown even when canonical equality says the value is unchanged.
18. The external-sync path preserves the current selection and restores `editor.root.scrollTop`, avoiding the flicker and scroll-reset regressions caused by Quill remounting.
19. Toolbar sync state updates: `syncState` transitions from `'dirty'` to `'clean'`.
20. Revert button becomes disabled (no longer dirty).
21. Status message: "Content reloaded from disk. Local changes were discarded."

## Button state matrix

| Condition | `revertDisabled` | Button appearance |
|-----------|-----------------|-------------------|
| No file selected (`selectedPath === null`) | `true` | Disabled |
| File selected, clean (`isDirty === false`) | `true` | Disabled |
| File selected, dirty (`isDirty === true`) | `false` | **Enabled** |
| Saving in progress | `true` | Disabled |

`revertDisabled` is computed in `EditorPanel` as: `!selectedPath || saving || !isDirty`

## State reads

| Kind | Source | Why |
|------|--------|-----|
| Target pane identity | Closure-captured `pane` or `workspace.layout.activePane` | Which pane to revert |
| Pane isDirty | `workspace.getPaneDocument(targetPane)` | Guard: only revert if dirty |
| Pane current path | `workspace.getPaneDocument(targetPane).path` | Which file to reload from disk |
| File content from disk | `window.tramaApi.readDocument(...)` via IPC | Source of truth for the revert |
| Document identity | `response.data.path` | Needed for image placeholder cache and canonical serialization |

## State writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| Pane document state | `PaneWorkspace.loadPaneDocument` → `setPrimaryPane`/`setSecondaryPane` | Content replaced, `isDirty: false`, meta refreshed, `reloadVersion` incremented |
| `loadingDocument` | `project-editor-private/actions.ts` | Temporarily `true` during the read |
| Quill DOM | `rich-markdown-editor-external-sync.ts` | Disk content re-applied in-place when `forceApplyVersion` advances, even if old and new parent markdown strings match |
| Toolbar sync state | `useSyncToolbarControls` | `syncState` → `'clean'` |
| Status message | `project-editor-private/actions.ts` | Set to confirm content was reloaded |

## Side effects

| Side effect | File |
|-------------|------|
| Image placeholder extraction (base64 → cache) | `markdown-image-placeholder.ts` via `stripBase64ImagesFromMarkdown` |
| External-value sync into Quill | `rich-markdown-editor-external-sync.ts` |
| Markdown -> Quill re-apply | `rich-markdown-editor-quill.ts` |
| Toolbar button state re-sync | `rich-markdown-editor-toolbar.ts` |

## Files to inspect

| File | Why inspect it |
|------|----------------|
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar.ts` + `private/rich-markdown-editor-toolbar-controller.ts` | Toolbar button wiring and revert/save/sync state synchronization |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor.tsx` | Receives and forwards `revertDisabled`/`onRevertNow` props |
| `src/features/project-editor/pane/editor-panel.tsx` | Computes `revertDisabled` from `isDirty`/`selectedPath`/`saving` and forwards `forceApplyVersion={reloadVersion}` |
| `src/features/project-editor/pane/workspace-editor-panels.tsx` | Wires pane-explicit `revertChanges(pane)` callback in `PaneEditor` |
| `src/features/project-editor/workspace-actions.ts` | `revertChanges` — guard + pre-reload flush + `loadDocument` dispatch |
| `src/features/project-editor/project-editor-private/actions.ts` | `loadDocument` — IPC read, image stripping, `loadPaneDocument` |
| `src/features/project-editor/pane/pane-workspace.ts` | `flushPaneContent()` and `loadPaneDocument()` — snapshot pending editor content, then set disk content + `isDirty: false` + `reloadVersion` |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-external-sync.ts` | Canonical external sync plus force-apply override for disk reloads; preserves selection and scroll |
| `src/features/project-editor/project-editor-types.ts` | `ProjectEditorActions.revertChanges` type definition |
| `src/features/project-editor/project-editor-strings.ts` | `revertChanges`, `statusRevertDone` string constants |
| `src/shared/ipc.ts` | `trama:document:read` channel definition and Zod schemas |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Revert button is disabled when it should be enabled | `isDirty` not propagating correctly to `EditorPanel` | `workspace-editor-panels.tsx` → `editor-panel.tsx` |
| Revert does nothing if clicked before debounce fires | Revert skipped the live editor flush or the pane reload did not advance the force-apply signal | `workspace-actions.ts` → `pane-workspace.ts` → `editor-panel.tsx` → `rich-markdown-editor-external-sync.ts` |
| Revert applies to the wrong pane in split mode | `revertChanges` called without explicit `pane`, falls back to `activePane` | `workspace-editor-panels.tsx` — check `onRevertNow` callback |
| Images disappear after revert | Placeholder-markdown leaked into Quill without proper hydration through external sync | `rich-markdown-editor-external-sync.ts` and `rich-markdown-editor-value-sync.ts` |
| Cursor jumps on revert | Selection was not preserved around the external-value re-apply | `rich-markdown-editor-external-sync.ts` |
| Document shows stale content after revert | `loadPaneDocument` not called, or called with wrong content | `project-editor-private/actions.ts` → `loadDocument` |
| Status message says "Loaded document" instead of "Reverted" | `loadDocument` generic message used instead of revert-specific message | `project-editor-private/actions.ts` → `loadDocument` |

## Key differences from related flows

| Aspect | `selectFile` | `revertChanges` |
|--------|-------------|-----------------|
| Saves dirty content first | ✅ Yes (calls `preparePaneExit`) | ❌ No |
| Changes active pane | ✅ Yes (calls `assignFileToActivePane`) | ❌ No |
| Reloads from disk | ✅ Yes (calls `loadDocument`) | ✅ Yes (calls `loadDocument`) |
| Guard condition | `canSelectFile(isDirty, path, filePath)` | `isDirty && path` |
| Use case | Navigate to a different or same file | Discard local edits on current file |

## High-value notes

- The revert button lives in `.rich-toolbar-controls` alongside the save button and sync indicator. It is positioned to the left of the save button.
- In split mode, each pane gets its own toolbar and its own revert button. The `PaneEditor` callback passes the explicit `pane` identity to `revertChanges(pane)`, preventing timing bugs where `activePane` points at the wrong pane.
- The revert action is intentionally **not awaitable** at the UI level — it fires and forgets. The `loadDocument` call is asynchronous but the UI does not block on it.
- `revertDisabled` follows the exact same logic as `saveDisabled`: `!selectedPath || saving || !isDirty`. When the button is disabled, no guard violation can occur even if called programmatically.
- Revert has two renderer-side invariants now: it must flush the live editor before reload, and disk reload must bump a pane-local `reloadVersion` so external sync force-applies the disk content even if the parent markdown string is text-identical to the previous clean value.

## Related hotspot

- `mds/architecture/rich-editor-hotspots.md` -> `Canonical external-value sync`
- `mds/flows/rich-editor-external-sync-flow.md` — Follow what happens after the disk content reaches Quill
- `mds/flows/rich-editor-typing-flow.md` — Follow how dirty marking and serialization work before revert
