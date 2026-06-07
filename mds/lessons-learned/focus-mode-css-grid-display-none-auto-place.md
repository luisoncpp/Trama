# CSS Grid: `display: none` removes items from grid layout

## Problem

Hiding a grid child with `display: none` removes it from the grid entirely. Remaining grid items are auto-placed into the first available cell, not their original position.

## Example

Before fix:
```css
.editor-workspace {
  grid-template-columns: 0px minmax(0, 1fr);
}
.editor-shell.is-focus-mode .sidebar-shell {
  display: none;  /* sidebar removed from grid */
}
```

With the sidebar removed, `.editor-main` (the only remaining item) auto-places into column 1 (`0px`), becoming invisible.

## Fix

Always switch the grid to a single column when hiding one of its children:
```css
.editor-shell.is-focus-mode .editor-workspace {
  grid-template-columns: 1fr;
}
```

## Principle

`display: none` in CSS Grid is not just visual hiding — it structurally removes the element from grid layout. When selectively hiding grid children, recalculate the grid template to match the remaining visible items.
