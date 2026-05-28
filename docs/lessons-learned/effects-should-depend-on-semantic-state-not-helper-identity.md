# Effects should depend on semantic state, not helper identity

## What to know

If a hook exposes a long-lived helper object like `PaneWorkspace`, effects must not treat that object's identity as a change signal for unrelated state.

That pattern can appear to work while the helper is recreated on every render-relevant change, but it is a false dependency. Once the helper becomes stable, those effects silently stop reacting.

## Effective pattern

Depend on the actual semantic inputs the effect cares about:

- dirty flags for close-state notification
- selected path and active pane for autosave scheduling
- specific layout paths for navigation seeding

Use the stable helper object only to perform the work.

## Why this matters here

`usePaneWorkspace()` now keeps one `PaneWorkspace` instance and syncs fresh pane/layout snapshots into it. That removes workspace identity churn, but it also means effects like `notifyCloseState` must depend on `primaryPane.isDirty` and `secondaryPane.isDirty`, not `paneWorkspace`.

## When this applies

- stable class/facade instances returned from hooks
- `useRef`-backed helpers with mutable dependencies
- any migration from render-tied helper recreation to stable instance ownership
