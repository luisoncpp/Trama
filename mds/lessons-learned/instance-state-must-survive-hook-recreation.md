# Instance State Must Survive Hook-Driven Recreation

## Problem

`PaneWorkspace` was created inside `useMemo` with dependencies (`paneBindings`, `layoutState`) that change on every keystroke. Each recreation called `destroy()` on the old instance, which cleared `lastSavedContentMap` — the snapshot used to suppress false-positive conflict panels after Google Drive sync.

The first fix attempt kept the instance stable with `useRef` + `updateDependencies()`. That solved the map survival problem but broke every effect that depended on `paneWorkspace` reference changes (e.g., `notifyCloseState` dirty tracking, external event handler closures capturing stale `isDirty`/`selectedPath` values).

## Correct Fix

Move the long-lived state (`lastSavedContentMap`) **out** of the ephemeral instance into a stable ref at the component level (`useProjectEditor`). Pass the external map into `PaneWorkspace` via constructor. The instance can still be recreated every render; the map survives because it is owned by a higher layer.

`PaneWorkspace.destroy()` only clears the map when the workspace owns it (no external map provided). This preserves backward compatibility for tests and standalone usage.

## Files Changed

- `src/features/project-editor/use-project-editor.ts` — owns stable `lastSavedContentMapRef`
- `src/features/project-editor/pane/pane-workspace.ts` — accepts optional external map
- `src/features/project-editor/pane/use-pane-workspace.ts` — passes external map through to constructor

## When This Applies

Whenever you store state inside a class/instance that is created by a Preact/React hook (`useMemo`, `useCallback`, custom hooks returning objects). If the hook's dependencies change frequently, internal instance state will be lost on every recreation unless:

1. The state is lifted outside the instance (refs, context, external stores), OR
2. The instance is truly stable (which has its own closure-stale pitfalls).

Prefer lifting state when the instance lifecycle is shorter than the data it holds.
