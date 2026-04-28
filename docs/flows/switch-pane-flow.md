# Switch Pane Flow

## Trigger

The user activates the other pane in split mode by clicking into that editor or by using the pane-switch shortcut.

## Entry point

`setWorkspaceActivePane(pane)` in `src/features/project-editor/use-project-editor-layout-actions.ts`.

## Why this flow matters

This flow mixes synchronous layout state with asynchronous document state. It is one of the easiest places to lose track of what is source of truth versus what is only a projection for the UI.

## Sequence

1. The user interacts with a split-pane editor.
2. In `workspace-editor-panels.tsx`, `PaneEditor` calls `actions.setWorkspaceActivePane(pane)` when activating the pane.
3. `useSetWorkspaceActivePaneAction(...)` reads the current outgoing pane from `values.workspaceLayout.activePane`.
4. It reads the outgoing pane document state from `values.primaryPane` or `values.secondaryPane`.
5. If the outgoing pane is dirty and has a path:
   - choose the matching serialization ref
   - call `flush()`
   - fall back to `outgoingState.content` only if `flush()` returns `null`
   - call `saveDocumentNow(...)`
6. The action computes the next assigned path from layout state:
   - `workspaceLayout.primaryPath`
   - `workspaceLayout.secondaryPath`
7. It updates `workspaceLayout.activePane` immediately.
8. If the next pane has no assigned path:
   - clear compare state
   - set the "no file selected" status
   - stop
9. If the pane has an assigned path but the document state is not already loaded for that pane:
   - call `loadDocument(nextPath, pane)`
10. `use-project-editor-state.ts` projects UI-facing aliases:
   - `selectedPath`
   - `editorValue`
   - `editorMeta`
   - `isDirty`
   from the new active pane.

## Reads

| Kind | Source | Why |
|------|--------|-----|
| Outgoing pane identity | `workspaceLayout.activePane` | Determines which pane may need flushing/saving |
| Outgoing pane state | `primaryPane` / `secondaryPane` | Determines dirty/path/meta/content |
| Next pane assigned path | `workspaceLayout.primaryPath` / `secondaryPath` | Layout layer is the immediate source of truth for pane assignment |
| Target pane document state | `primaryPane.path` / `secondaryPane.path` | Decides whether async load is still needed |

## Writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| Saved outgoing document | `use-project-editor-actions.ts` | Dirty outgoing pane may be persisted before switch |
| `workspaceLayout.activePane` | `use-project-editor-layout-actions.ts` | Active pane changes immediately |
| Status / compare state | `use-project-editor-layout-actions.ts` | Updated when pane has no file |
| Target pane document state | `use-project-editor-actions.ts` + IPC read | Loaded asynchronously if needed |
| UI aliases | `use-project-editor-state.ts` | Reprojected from the newly active pane |

## Side effects

| Side effect | File |
|-------------|------|
| Flush-before-switch | `use-project-editor-layout-actions.ts` |
| Renderer save through IPC | `use-project-editor-actions.ts` |
| Async document load | `use-project-editor-actions.ts` |
| Sidebar selected file projection | `use-project-editor-state.ts` |

## Files to inspect

| File | Why inspect it |
|------|----------------|
| `src/features/project-editor/components/workspace-editor-panels.tsx` | Pane activation wiring and explicit pane identity |
| `src/features/project-editor/use-project-editor-layout-actions.ts` | Switch-pane action and flush-before-switch |
| `src/features/project-editor/use-project-editor-state.ts` | Active-pane UI projection layer |
| `src/features/project-editor/use-project-editor-actions.ts` | `saveDocumentNow(...)` and `loadDocument(...)` |
| `docs/architecture/split-pane-coordination.md` | Canonical split-pane contracts |
| `docs/lessons-learned/split-pane-sidebar-layout-vs-pane-path.md` | Layout-path vs loaded-pane-path distinction |
| `docs/lessons-learned/split-pane-pane-targeted-save.md` | Explicit pane identity for save actions |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Sidebar highlights the wrong file after switch | Used loaded pane path instead of layout path for UI projection | `use-project-editor-state.ts` |
| Save happens on the wrong pane during switch | A code path fell back to inferred active pane instead of explicit pane identity | `use-project-editor-layout-actions.ts` |
| Pane switch loses edits | Flush-before-switch path did not run or used stale content after flush | `use-project-editor-layout-actions.ts` |
| Pane activates but shows blank until load completes | Expected if layout path updated before async load, but check projection rules if sidebar also goes blank | `use-project-editor-state.ts` |

## High-value notes

- `workspaceLayout.primaryPath` and `workspaceLayout.secondaryPath` are layout decisions.
- `primaryPane.path` and `secondaryPane.path` are loaded document state.
- For split-pane UI, layout state often needs to drive immediate UI decisions before async document loading finishes.
