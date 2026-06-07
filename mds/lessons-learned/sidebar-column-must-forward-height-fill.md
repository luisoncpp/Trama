# Sidebar Column Wrapper Must Forward Height Fill

**Date:** 2026-05-31

## What broke

Adding `.sidebar-column` around `.sidebar-shell` for the drag-resize handle moved the grid child one level up. `.sidebar-shell` stopped stretching with the `.editor-workspace` row and instead sized to its content height.

Symptoms: sidebar grew vertically with tree content, editor area no longer aligned in height, and a second page scrollbar could appear.

## Fix

Keep `.sidebar-column` as a flex column with `min-height: 0` and `overflow: hidden`, and give the direct `.sidebar-shell` child `flex: 1 1 auto; min-height: 0`.

## Invariant

Any wrapper inserted between `.editor-workspace` and `.sidebar-shell` must preserve the height-fill chain. Do not rely on the child inheriting grid stretch once it is no longer the grid item.

The drag handle must **not** sit inside `.sidebar-column` when that wrapper uses `overflow: hidden` — the handle extends into the workspace gap and gets clipped. Mount it on `.editor-workspace` instead and position with `left: calc(var(--sidebar-width) + 1px)`.
