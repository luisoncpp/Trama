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
| `buildValues()` | `use-project-editor-state.ts` |
| `useProjectEditorUiActions()` | `use-project-editor-ui-actions.ts` |
| `useDocumentState()` | `use-project-editor-sub-state-hooks.ts` |

All three had the same pattern:
```typescript
const activePane = activePane === 'secondary' ? secondaryPane : primaryPane
const activePanePath = activePane === 'secondary' ? secondaryPath : primaryPath
```

## Solution

Extracted to `deriveActivePaneDocument(workspaceLayout, primaryPane, secondaryPane)` in `project-editor-logic.ts`. All three call sites now delegate to it:

```typescript
// in use-project-editor-state.ts, use-project-editor-ui-actions.ts, use-project-editor-sub-state-hooks.ts
const { selectedPath, editorValue, editorMeta, isDirty } = deriveActivePaneDocument(ws, primaryPane, secondaryPane)
```

## Rule

When the projection logic changes (e.g., adding a new field), change it in one function. Never copy-paste pane-projection logic across modules.