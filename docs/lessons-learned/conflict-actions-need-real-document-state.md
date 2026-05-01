# Conflict actions need real document state, not stubs

When wiring secondary action sets (e.g., conflict resolution actions) into a composite actions object, passing a stub `documentState` with `selectedPath: null` silently breaks flows that depend on it.

## What happened

During a refactor that split `values` into sub-states, `useProjectEditorUiActions` started creating a local `documentState` stub to pass to `useSecondaryProjectEditorActions`:

```typescript
const documentState = { selectedPath: null, editorValue: '', editorMeta: {}, isDirty: false }
```

`useResolveConflictSaveAsCopyAction` checks `if (!documentState.selectedPath)` and returns early. Because the stub always had `selectedPath: null`, the save-as-copy flow never executed. Tests passed for every other action but failed for conflict save-as-copy with no obvious error — the callback simply did nothing.

## The fix

Derive the real `documentState` dynamically from `paneState` + `layoutState` (the same logic `useDocumentState` uses), memoized with `useMemo`:

```typescript
const activePane = layoutState.workspaceLayout.activePane === 'secondary'
  ? paneState.secondaryPane
  : paneState.primaryPane
const documentState = useMemo(() => ({
  selectedPath: activePanePath,
  editorValue: activePane.content,
  editorMeta: activePane.meta,
  isDirty: activePane.isDirty,
}), [activePanePath, activePane.content, activePane.meta, activePane.isDirty])
```

## Counter-intuitive detail

TypeScript types matched perfectly — the stub satisfied `ProjectEditorDocumentState`. The bug was invisible to the compiler because `null` is a valid value for `selectedPath`. This is a runtime logic bug that only manifests when the action is invoked in a real flow.

## Prevention

When decomposing state into sub-objects for memoization, never create synthetic stubs for downstream action hooks. Either:
1. Derive the sub-state from real state slices, or
2. Change the action hook signature to accept the raw state slices and compute internally.

## Related files

- `src/features/project-editor/use-project-editor-ui-actions.ts`
- `src/features/project-editor/use-project-editor-conflict-actions.ts`
- `src/features/project-editor/use-project-editor-sub-state-hooks.ts`
