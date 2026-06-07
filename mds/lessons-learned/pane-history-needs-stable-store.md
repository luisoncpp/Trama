# Pane history needs stable store

Pane navigation history is session state, not derived state.

If that history lives inside `PaneWorkspace`, it will be lost whenever the workspace instance is recreated by normal hook dependency changes. In this codebase, `usePaneWorkspace(...)` returns a new `PaneWorkspace` through `useMemo(...)` whenever layout or pane bindings change, so instance-owned history is not durable enough.

The stable pattern is:

1. Keep the history store in a `useRef` owned by `useProjectEditor`.
2. Inject that store into `PaneWorkspace`.
3. Reset it only in explicit lifecycle boundaries such as `openProject()` and `clearEditor()`, not in passive effects keyed by `rootPath`.

Why the last point matters:

A `rootPath` effect can run after a project-open flow already started recording initial navigation entries. That creates a race where the app opens documents correctly, but the newly-seeded history is immediately wiped.

Future rule:

Any state that must survive helper-instance recreation should live in a stable ref or real state owner above that helper, then be injected downward.
