# Projected pane state: one function, not three

## Pattern

Active pane state (`selectedPath`, `editorValue`, `editorMeta`, `isDirty`) is derived from:
- `workspaceLayout.activePane` — which pane is active ('primary' | 'secondary')
- `workspaceLayout.primaryPath` / `workspaceLayout.secondaryPath` — layout paths
- `primaryPane` / `secondaryPane` — per-pane document state

The projection `activePane → {selectedPath, editorValue, editorMeta, isDirty}` must live in **one place**. Duplicating it causes desync: when one copy changes, `selectedPath` in the UI and `isDirty` in actions point to different panes.

## Three places that used to duplicate this

| Module | Location |
|--------|----------|
| `values` projection | `project-editor-private/state.ts` |
| Action assembly | `project-editor-private/actions.ts` |
| Shared projection helper | `project-editor-logic.ts` |

All three had the same pattern:
```typescript
const activePane = activePane === 'secondary' ? secondaryPane : primaryPane
const activePanePath = activePane === 'secondary' ? secondaryPath : primaryPath
```

## Solution

Extracted to `deriveActivePaneDocument(workspaceLayout, primaryPane, secondaryPane)` in `project-editor-logic.ts`. The private state and action assembly now delegate to it instead of duplicating the projection:

```typescript
// in project-editor-private/state.ts and related project editor assembly
const { selectedPath, editorValue, editorMeta, isDirty } = deriveActivePaneDocument(ws, primaryPane, secondaryPane)
```

## Rule

When the projection logic changes (e.g., adding a new field), change it in one function. Never copy-paste pane-projection logic across modules.
