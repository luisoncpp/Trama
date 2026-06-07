# Sub-state memoization prevents false re-render cascades

When a single `values` object with 20+ fields is recreated on every render, every `useCallback` and `useEffect` that depends on it re-creates too, even if the specific fields they care about haven't changed.

## What happened

`useProjectEditorState` returned a `values` object built fresh each render from `primaryPane`, `secondaryPane`, `workspaceLayout`, and other state slices. Action hooks consumed `values` in their dependency arrays, so every state change — even irrelevant ones like `statusMessage` — re-created all callbacks.

## The fix

Decompose `values` into 6 focused sub-states memoized with `useMemo`:

- `documentState` — active pane path, content, meta, dirty flag
- `layoutState` — workspace layout
- `sidebarState` — sidebar section, collapse, width, focus mode flag
- `projectState` — root path, snapshot, visible files, corkboard order
- `uiState` — loading/saving/fullscreen/conflict/message flags

Action hooks receive only the sub-states they need. A change to `statusMessage` no longer re-creates `useToggleFocusModeAction` because that hook only depends on `layoutState` and `sidebarState`.

## Counter-intuitive detail

Keeping the old `values` in the return type for backward compatibility is fine, but **do not let new action hooks depend on it**. The memoization win only materializes if every downstream consumer switches to the granular sub-states.

## Related files

- `src/features/project-editor/project-editor-private/state.ts`
