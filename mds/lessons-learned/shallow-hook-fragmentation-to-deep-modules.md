# Shallow hook fragmentation to deep modules

## Problem

The Project Editor surface was sliced into ~15 tiny hook files whose interfaces were larger than their implementations. `useLayoutState`, `useSidebarSt`, and `useUiSt` were one-line `useMemo` wrappers. Action hooks were `useCallback` shells around 3–10 lines of setter logic. `buildProjectEditorActions` was an identity function.

The deletion test failed on every file: deleting any one did not concentrate complexity, it just forced the same one-line wrapper back into callers.

## Solution

1. Inline sub-state builders into `useProjectEditorState` — they were not earning their keep as independent modules.
2. Merge tiny action wrappers into 2–3 cohesive plain modules:
   - `workspace-actions.ts` — layout, pane, focus, fullscreen, editor view, save, revert
   - `sidebar-file-actions/` — sidebar UI, file/folder CRUD (with `private/` helpers)
   - `conflict-actions.ts` — conflict resolution
3. Keep core operations (load, save, open, clear) as they were — they have real logic and independent tests.
4. Replace 15 `useCallback` hooks with one `useMemo` in the thin adapter (`useProjectEditorActions`).

## What made it work

- **Plain functions, not hooks.** The deep modules are plain TypeScript. They receive setters as arguments and call them directly. No Preact dependency, no hook rules, no `useCallback` identity gymnastics.
- **Private helpers under the seam.** `sidebar-file-actions/private/` contains implementation files that are not independently tested. The public `index.ts` is the seam. This respects the `max-lines: 200` lint limit without splitting the interface.
- **Stable setters memoization.** `useProjectEditorState` now builds a stable `setters` object by depending on individual stable `useState` setters instead of the whole `coreState` object. This makes the adapter `useMemo` actually stable.

## When to apply

Any time you see:
- A directory with 10+ `useXAction` files under 50 lines each
- `useCallback` wrappers that only exist to satisfy a hook-based composition convention
- An identity function like `buildProjectEditorActions(input) => input` pretending to be an abstraction

## Date

2026-05-20
