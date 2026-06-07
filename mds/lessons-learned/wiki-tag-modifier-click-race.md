# Wiki Tag Modifier Click Race

Date: 2026-04-11

## Issue

Ctrl/Cmd+click navigation for wiki tags was intermittent because navigation depended on a derived `ctrlPressed` UI state, not the actual mouse event modifier state.

## Root Cause

- `keydown` updates React state asynchronously.
- A fast Ctrl+click can fire before the `ctrlPressed` render is committed.
- In that window, click handling can see `ctrlPressed = false` and skip navigation.

## Fix

- Use the real modifier from the mouse event (`event.ctrlKey || event.metaKey`) for navigation decisions.
- Handle navigation on `onMouseDownCapture` instead of `onClick` to avoid losing modifier state between press and release.
- Keep key-state tracking only for visual highlight behavior, and reset it on `window.blur` to avoid stuck modifier UI.
- Add a synchronous match-computation fallback on click so navigation does not depend on a prior highlight render.

## Rule of Thumb

For modifier-gesture interactions, use event-time modifier state for behavior and hook state only for visuals.