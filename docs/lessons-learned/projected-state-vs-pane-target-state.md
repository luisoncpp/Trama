# Projected pane state: avoid duplicating the projection calculation

## Pattern

Active pane state (`selectedPath`, `editorValue`, `editorMeta`, `isDirty`) is derived from two inputs:
- `workspaceLayout.activePane` — which pane is active ('primary' | 'secondary')
- `workspaceLayout.primaryPath` / `workspaceLayout.secondaryPath` — layout paths
- `primaryPane` / `secondaryPane` — per-pane document state

The projection `activePane → {selectedPath, editorValue, editorMeta, isDirty}` must live in **one place**. Duplicating it in two modules causes desync risk: when one copy is updated and the other isn't, `selectedPath` in the UI and `isDirty` in actions point to different panes.

## Where this was deduplicated

The projection lived in two places:
- `buildValues()` in `use-project-editor-state.ts`
- `useProjectEditorUiActions()` in `use-project-editor-ui-actions.ts`

Both used the same pattern:
```typescript
const activePane = activePane === 'secondary' ? secondaryPane : primaryPane
const activePanePath = activePane === 'secondary' ? secondaryPath : primaryPath
```

Extracted to `deriveActivePaneDocument(workspaceLayout, primaryPane, secondaryPane)` in `project-editor-logic.ts`.

## Rule

When the projection logic changes (e.g., adding a new field), change it in one function and let both call sites use it. Never copy-paste pane-projection logic across modules.