# Sidebar Width Must Mirror Responsive Collapse in the Layout Owner

**Date:** 2026-05-23

## What is counter-intuitive

`SidebarPanel` used to derive its effective collapsed state as `sidebarPanelCollapsed || isResponsiveCollapsed` (where `isResponsiveCollapsed` comes from `useSidebarResponsiveCollapse`, which fires when the viewport is ≤ 900 px).

The parent grid wrapper in `ProjectEditorView` also needs to know this effective collapsed value so it can set `--sidebar-width` correctly. If the grid uses only `sidebarPanelCollapsed` while the sidebar component uses the OR of both, the values diverge on narrow viewports:

- User clicks a new rail section while on a narrow viewport.
- `setSidebarSection` auto-expands the panel by setting `sidebarPanelCollapsed = false`.
- `ProjectEditorView` immediately widens `--sidebar-width` from 72 px to `sidebarPanelWidth` (e.g. 300 px), allocating blank space in the grid.
- But `SidebarPanel.effectiveCollapsed` stays `true` (because `isResponsiveCollapsed` is still `true`), so the sidebar shell renders at 72 px.
- Result: a visible gap between the sidebar and the editor panel.

## The old fix that worked but did not scale

The first safe patch was to duplicate the **same** responsive collapse calculation in the layout owner (`ProjectEditorView`):

```ts
const isResponsiveCollapsed = useSidebarResponsiveCollapse()
const effectiveSidebarCollapsed = state.sidebarPanelCollapsed || isResponsiveCollapsed
const sidebarStyle = { '--sidebar-width': effectiveSidebarCollapsed ? '72px' : `${state.sidebarPanelWidth}px` }
```

That removed the visible gap, but it kept two owners in sync by convention.

## Current fix

`useSidebarLayout()` is now the single owner of:

```ts
effectiveCollapsed = sidebarPanelCollapsed || isResponsiveCollapsed
sidebarWidthPx = effectiveCollapsed ? 72 : sidebarPanelWidth
```

`ProjectEditorView` consumes that hook to write `--sidebar-width`, and `SidebarPanel` consumes the same hook output through props.

## Invariant going forward

Any component that allocates or renders sidebar width must consume `useSidebarLayout()` output rather than re-deriving collapse locally. The duplicate-expression approach is superseded.
