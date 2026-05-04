# Rich Editor Revert Changes Flow

## Trigger

User clicks the "Revertir cambios" (revert changes) button in the editor toolbar.

## Entry point

`revertChanges(pane?)` action in `use-project-editor-ui-actions-helpers.ts`, wired via `useRevertChangesAction`.

## Why this flow matters

This is the only path where the user intentionally **discards** unsaved edits and reloads the file from disk. It differs from the external-sync flow in two critical ways:

- External sync decides to apply or skip based on canonical equivalence. Revert **always** reloads from disk.
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
4. Guard check: `workspace.getPaneDocument(targetPane)` returns `{ path, isDirty }`.
5. If `!isDirty || !path`: return immediately — button should be disabled but double-check.
6. If guard passes: call `loadDocument(path, targetPane)`.
7. `loadDocument` sets `loadingDocument = true`.
8. `loadDocument` calls `window.tramaApi.readDocument({ path })` via IPC `trama:document:read`.
9. The main process handler reads the file from disk (`document-repository.ts`).
10. The response envelope carries `{ path, content, meta }`.
11. `stripBase64ImagesFromMarkdown(content, path)` extracts base64 images into the in-memory cache, replacing them with `<!-- IMAGE_PLACEHOLDER:... -->` markers.
12. `paneWorkspace.loadPaneDocument(targetPane, path, markdownWithoutImages, meta)` is called:
    - Sets `isDirty: false` on the target pane
    - Updates the pane's content with the clean disk version
    - Updates the pane's meta from disk
13. `RichMarkdownEditor` re-renders with the new `value` prop (clean content).
14. `useSyncExternalValue()` detects a non-equivalent value and applies it into Quill:
    - Sets `isApplyingExternalValueRef = true`
    - Calls `applyMarkdownToEditor(editor, value, 'silent', documentId)`
    - Preserves/captures selection (but since the document was just replaced, selection resets)
    - Clears `isApplyingExternalValueRef` on `setTimeout(0)`
15. Toolbar sync state updates: `syncState` transitions from `'dirty'` to `'clean'`.
16. Revert button becomes disabled (no longer dirty).
17. Status message: "Content reloaded from disk. Local changes were discarded."

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
| Pane document state | `PaneWorkspace.loadPaneDocument` → `setPrimaryPane`/`setSecondaryPane` | Content replaced, `isDirty: false`, meta refreshed |
| `loadingDocument` | `use-project-editor-actions.ts` | Temporarily `true` during the read |
| Quill DOM | `rich-markdown-editor-external-sync.ts` → `rich-markdown-editor-quill.ts` | Replaced with disk content via external sync |
| `lastEditorValueRef.current` | editor component refs | Updated to canonical form of the disk content |
| `isApplyingExternalValueRef.current` | editor component refs | Temporarily locks outbound `text-change` handling |
| Toolbar sync state | `useSyncToolbarControls` | `syncState` → `'clean'` |
| Status message | `use-project-editor-actions.ts` | Set to confirm content was reloaded |

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
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar.ts` | Toolbar button creation, `revertDisabled`/`onRevertNow` wiring |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor.tsx` | Receives and forwards `revertDisabled`/`onRevertNow` props |
| `src/features/project-editor/pane/editor-panel.tsx` | Computes `revertDisabled` from `isDirty`/`selectedPath`/`saving` |
| `src/features/project-editor/pane/workspace-editor-panels.tsx` | Wires pane-explicit `revertChanges(pane)` callback in `PaneEditor` |
| `src/features/project-editor/use-project-editor-ui-actions-helpers.ts` | `useRevertChangesAction` — guard + `loadDocument` dispatch |
| `src/features/project-editor/use-project-editor-actions.ts` | `useLoadDocument` — IPC read, image stripping, `loadPaneDocument` |
| `src/features/project-editor/pane/pane-workspace.ts` | `loadPaneDocument` — sets content + `isDirty: false` on the target pane |
| `src/features/project-editor/project-editor-types.ts` | `ProjectEditorActions.revertChanges` type definition |
| `src/features/project-editor/project-editor-strings.ts` | `revertChanges`, `statusRevertDone` string constants |
| `src/shared/ipc.ts` | `trama:document:read` channel definition and Zod schemas |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Revert button is disabled when it should be enabled | `isDirty` not propagating correctly to `EditorPanel` | `workspace-editor-panels.tsx` → `editor-panel.tsx` |
| Revert applies to the wrong pane in split mode | `revertChanges` called without explicit `pane`, falls back to `activePane` | `workspace-editor-panels.tsx` — check `onRevertNow` callback |
| Images disappear after revert | Placeholder-markdown leaked into Quill without proper hydration through external sync | `rich-markdown-editor-external-sync.ts` and `rich-markdown-editor-value-sync.ts` |
| Cursor jumps on revert | Selection was not preserved around the external-value re-apply | `rich-markdown-editor-external-sync.ts` |
| Document shows stale content after revert | `loadPaneDocument` not called, or called with wrong content | `use-project-editor-actions.ts` → `useLoadDocument` |
| Status message says "Loaded document" instead of "Reverted" | `loadDocument` generic message used instead of revert-specific message | `use-project-editor-actions.ts` → `useLoadDocument` |

## Key differences from related flows

| Aspect | `selectFile` | `revertChanges` |
|--------|-------------|-----------------|
| Saves dirty content first | ✅ Yes (calls `savePaneIfDirty`) | ❌ No |
| Changes active pane | ✅ Yes (calls `assignFileToActivePane`) | ❌ No |
| Reloads from disk | ✅ Yes (calls `loadDocument`) | ✅ Yes (calls `loadDocument`) |
| Guard condition | `canSelectFile(isDirty, path, filePath)` | `isDirty && path` |
| Use case | Navigate to a different or same file | Discard local edits on current file |

## High-value notes

- The revert button lives in `.rich-toolbar-controls` alongside the save button and sync indicator. It is positioned to the left of the save button.
- In split mode, each pane gets its own toolbar and its own revert button. The `PaneEditor` callback passes the explicit `pane` identity to `revertChanges(pane)`, preventing timing bugs where `activePane` points at the wrong pane.
- The revert action is intentionally **not awaitable** at the UI level — it fires and forgets. The `loadDocument` call is asynchronous but the UI does not block on it.
- `revertDisabled` follows the exact same logic as `saveDisabled`: `!selectedPath || saving || !isDirty`. When the button is disabled, no guard violation can occur even if called programmatically.

## Related hotspot

- `docs/architecture/rich-editor-hotspots.md` -> `Canonical external-value sync`
- `docs/flows/rich-editor-external-sync-flow.md` — Follow what happens after the disk content reaches Quill
- `docs/flows/rich-editor-typing-flow.md` — Follow how dirty marking and serialization work before revert
