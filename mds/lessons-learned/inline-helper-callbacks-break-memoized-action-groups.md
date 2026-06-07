# Inline helper callbacks break memoized action groups

## What to know

A memoized action group can still churn on every render if one of its inputs is an inline helper callback created at the call site.

That kind of dependency leak is easy to miss because the real state inputs may already be stable.

## Effective pattern

If a helper callback is passed into another hook and participates in downstream `useMemo` or `useCallback` dependencies, give it its own named `useCallback(...)`.

Do not pass inline wrappers like `() => paneWorkspace.clearNavigationHistory()` into memoized orchestration hooks.

## Why this matters here

After `PaneWorkspace` became stable, `useProjectEditorActions()` still rebuilt sidebar and conflict action groups on every render because `useOpenProject()` received a fresh inline `resetPaneNavigationHistory` callback each time.

Memoizing that helper exposed the intended dependency model:

- workspace actions change with workspace/layout/UI inputs
- sidebar actions change with sidebar/layout/project inputs
- conflict actions change with conflict/project inputs

## When this applies

- grouped action builders
- orchestration hooks that accept helper callbacks
- any refactor where large memoized objects still churn after the obvious state dependencies were narrowed
