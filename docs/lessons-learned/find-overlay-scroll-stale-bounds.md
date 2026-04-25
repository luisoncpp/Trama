# Find overlay highlight drifts on scroll

Date: 2026-04-22

## Context

The in-document find feature renders an absolute-positioned highlight box (`.editor-find-highlight`) over the active match. The highlight was computed once when the active match changed and stored in Preact state. When the user scrolled the editor, the highlight remained fixed in viewport coordinates while the text moved, causing a visible misalignment.

## Root Cause

The `activeBounds` state was cached in `useState` and only recalculated when the effect dependencies (`activeMatch`, `query`, etc.) changed. Scroll events were not in the dependency array, so after any scroll the highlight coordinates became stale.

Additionally, `getActiveMatchBounds` originally used `container.offsetTop + bounds.top`, which is fragile when the offset-parent chain changes.

## Fix

1. Removed `activeBounds` from `useState`. Bounds are now computed fresh on every render by calling `getActiveMatchBounds()` directly in the component body — mirroring the `TagHighlights`/`resolveBounds` pattern.
2. Added a `scroll` listener on `.ql-container` that increments a `scrollTick` state variable. The tick change forces a re-render, which re-runs the fresh bounds calculation.
3. Replaced `offsetTop/offsetLeft` with `getBoundingClientRect()` differences (`containerRect.top - shellRect.top + bounds.top`), exactly like the tag overlay fix.
4. Applied `mapPlainTextIndexToQuillIndex()` to correct the plain-text-vs-delta-index mismatch when embeds exist.
5. Fixed `mapPlainTextIndexToQuillIndex` to use `<` instead of `<=` when checking if a plain-text offset falls inside a string op. This ensures offsets that land exactly on a boundary between string ops skip past intermediate embeds (e.g. center boundaries, spacers, pagebreaks) instead of pointing at the embed itself.

## Rule

Any overlay that positions itself with `position: absolute` relative to a scrolled container must either:
- Be rendered **inside** the scroll container (so CSS positioning handles scroll automatically), or
- Recompute its coordinates **on every scroll event** if it lives outside the scroll container.

Prefer the first option when possible. If the overlay must live outside (e.g. to avoid being clipped), use a scroll listener to trigger fresh geometry reads.

## Regression Coverage

`tests/rich-markdown-editor-find-regression.test.ts` verifies:
- `getActiveMatchBounds` never reads `offsetTop/offsetLeft`.
- `getActiveMatchBounds` converts plain-text offsets through `mapPlainTextIndexToQuillIndex` when embeds precede the match.
- Scrolling `.ql-container` triggers a fresh `getBounds` call.
