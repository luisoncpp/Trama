# Tag overlay bounds go stale after layout changes (resize, split toggle)

Date: 2026-04-21

## Context

Wiki-tag underlines appeared at wrong positions or not at all after resizing the window or toggling between twin/single view. The underlines fixed themselves temporarily after switching split mode. Words that should be underlined (e.g. "Lirio", "Aina") were either mis-positioned or missing.

## Root Cause

`useTagOverlay` computed `getBounds()` inside a `useMemo` keyed on `[editorRef.current, tagIndex]`. When Ctrl was pressed, React re-rendered the component, but `useMemo` returned cached bounds from a previous render. After layout changes (window resize, split-mode toggle), Quill's `getBounds()` returns different pixel coordinates for the same character indexes, but the cached bounds were never recalculated.

The temporary fix from toggling split mode worked because it forced a full editor remount (new `documentId` or unmount/remount cycle), which changed `editorRef.current` and invalidated the `useMemo`.

## Fix

Separated concerns: text matching (cheap, cacheable) from geometric bounds (must be fresh on every render when visible).

- `useTagOverlay` now returns `TagMatch[]` (text offsets only, no bounds), cached by `[editorRef.current, tagIndex]`.
- `TagHighlights` receives the Quill editor instance and computes `getBounds()` fresh on every render.
- Click handler (`useTagClickHandler`) continues to call `buildTagOverlayMatches` directly at event time, which already computes fresh bounds.

## Rule

Never cache Quill `getBounds()` results across renders. Bounds are layout-dependent and become stale whenever the editor container changes size, position, or scroll. Cache only the text-matching phase (tag positions as text offsets); resolve geometry at render or event time.