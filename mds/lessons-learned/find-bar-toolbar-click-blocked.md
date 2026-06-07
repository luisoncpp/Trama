# Find bar buttons blocked by toolbar drag region

Date: 2026-06-01

## Context

The in-document find panel (`.editor-findbar`) is absolutely positioned at the top-right of `.rich-editor-shell`, overlapping the Quill toolbar. On Windows with the overlay titlebar, the toolbar uses `-webkit-app-region: drag` for window dragging.

## Symptom

Find input could receive focus (Ctrl/Cmd+F), but Prev/Next/Close/Replace buttons did not respond to clicks.

## Root cause

Electron/Chromium treats overlapping `-webkit-app-region: drag` areas as higher priority for hit-testing than sibling UI painted on top unless the overlay explicitly opts out. The find bar sat in the same screen rectangle as the draggable toolbar without `no-drag`, so clicks were consumed for window drag instead of button activation.

Flex-shrink on narrow panes could also shrink buttons when the row overflowed.

## Fix

1. Raise `.editor-findbar` stacking (`z-index: 20`) and set `-webkit-app-region: no-drag` on the bar and its controls.
2. Prevent flex shrink on find-bar inputs, count, and buttons.
3. Skip editor-shell `mousedown` capture handling when the event target is inside `.editor-findbar`.
4. Stop `mousedown` propagation from the find bar so editor-level handlers do not interfere.

## Rule

Floating controls that overlap a draggable toolbar/titlebar region must set `-webkit-app-region: no-drag` and sit above the toolbar in z-order. Prefer `flex-shrink: 0` on compact toolbars so controls stay clickable when space is tight.
