# Split Pane: preferredPane Overridden After openProject

Date: 2026-04-04

## Context

WS1 implementation added a `preferredPane` parameter to `openProject` so that conflict resolution flows (save-as-copy) could reopen the project while keeping the newly created file in the same pane (secondary) where the conflict occurred.

Infrastructure added:
- `openProject(root, preferredFilePath?, preferredPane?)` — extended signature
- `applyPreferredPathToActivePane` helper in `project-editor-logic.ts`
- `setWorkspaceLayout((previous) => { ...reconciled, activePane: preferredPane })` inside `applyOpenedProject`

## Removed Test (Historical)

```ts
// tests/project-editor-conflict-flow.test.ts
it('keeps copied conflict document in active secondary pane after reopening project', ...)
```

This test set up a split layout with `activePane: 'secondary'`, triggered save-as-copy from a conflict on the secondary pane document, and asserted that after `openProject` completed, the new file was in `secondaryPath` and `activePane` was still `'secondary'`.

## Symptom

The test failed repeatedly: after `openProject` returned, `activePane` could become `'primary'` and the new file could land in `primaryPath` instead of `secondaryPath`.

## Root Cause

`applyOpenedProject` set `activePane: preferredPane` during reconciliation, but the editor still used a single-document state model. Later document loads and pane switches could overwrite user intent because `selectedPath/content/meta/isDirty` were shared across panes.

The deeper issue was architectural: a **single-document state model** (`selectedPath`, `content`, `meta`, `isDirty`) cannot guarantee stable pane isolation.

## Final Resolution (Implemented)

Implemented changes that resolved the issue:

1. Added `PaneDocumentState` and moved editor content/dirty tracking to per-pane state (`primaryPane`, `secondaryPane`).
2. Updated `loadDocument` to receive an explicit target pane.
3. Kept `openProject(..., preferredFilePath, preferredPane)` and reconciled active pane intent before loading docs.
4. Loaded inactive split pane explicitly when needed so both panes keep coherent content.
5. Reintroduced the removed test and made it pass.

Key implementation files:
- `src/features/project-editor/use-project-editor-state.ts`
- `src/features/project-editor/use-project-editor-actions.ts`
- `src/features/project-editor/use-project-editor-open-project.ts`
- `src/features/project-editor/use-project-editor-ui-actions.ts`
- `tests/project-editor-conflict-flow.test.ts`

## Anti-Stall Rules for Future Changes

1. If behavior depends on pane identity, do not store it in global single-document fields.
2. Any read/load/save path touching split mode must accept pane context explicitly.
3. When adding split-mode tests, make setup deterministic against persisted layout state (do not assume initial `single` mode).
4. If `max-lines` or `max-lines-per-function` block progress, extract logic to dedicated modules early instead of patching repeatedly in place.
