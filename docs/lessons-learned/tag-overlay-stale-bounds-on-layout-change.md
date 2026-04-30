# Tag overlay stale bounds and positions (resize, split toggle, typing, file switch)

Date: 2026-04-21 (initial fix)
Date: 2026-04-29 (extended fix: stale positions on typing)
Date: 2026-04-29 (performance fix: deferred matching with dirty flag)

## Context

Wiki-tag underlines appeared at wrong positions or not at all after:
- resizing the window or toggling between twin/single view
- **typing in unsaved files** (the underlines would distort as user typed)
- **switching between files** (old matches persisted to new document)

The underlines fixed themselves temporarily after switching split mode.

## Root Cause

Four separate bugs with similar symptoms:

### Bug 1 (2026-04-21): Stale bounds after layout changes

`useTagOverlay` computed `getBounds()` inside a `useMemo` keyed on `[editorRef.current, tagIndex]`. After layout changes, Quill's `getBounds()` returns different pixel coordinates but cached bounds were never recalculated.

### Bug 2 (2026-04-29): Stale positions on typing

`useTagOverlay` used `useMemo` with `[editorRef.current, tagIndex]` dependencies. The Quill instance reference is stable — typing changes content but not the instance reference. So memo was never invalidated, returning stale positions while bounds were fresh, causing misalignment.

### Bug 3 (2026-04-29): Performance impact with large documents

With `useMemo` removed, `findTagMatchesInText()` ran on every render (every keystroke). For large documents with many tags, this caused noticeable lag.

### Bug 4 (2026-04-29): Stale matches on file switch

When switching documents, `tagOverlayMatchesRef.current` retained matches from the previous document, causing wrong underlines to appear until toggling twin view.

## Fix

**Bug 1 fix (2026-04-21):** Separated text matching (cacheable) from geometric bounds (fresh on every render).

**Bug 2 & 3 fix (2026-04-29):** Deferred matching with dirty flag model:
- `text-change` handler sets `tagOverlayRecalcRef.current = true` (marks dirty, no computation)
- `useTagOverlay` only recomputes when `ctrlPressed === true` AND (dirty OR matches empty)
- On recompute: reads text, runs matching, stores in ref, clears dirty flag
- This moves O(n) regex from every render to only when Ctrl is held

**Bug 4 fix (2026-04-29):** Effect on `documentId` change clears both `tagOverlayMatchesRef.current` and `tagOverlayRecalcRef.current`.

The architecture is now:

- `useTagOverlay({ editorRef, tagIndex, ctrlPressed, tagOverlayRecalcRef, tagOverlayMatchesRef })` → returns `TagMatch[]` from ref, recomputes only on Ctrl + dirty
- `text-change` in `rich-markdown-editor-serialization.ts` sets dirty flag without computing
- `TagHighlights` receives Quill editor instance, calls `resolveBounds()` every render for fresh pixel coordinates
- `buildTagOverlayMatches()` (used by click handler) computes fresh bounds at event time, never cached
- `resetTagOverlayOnDocChange` effect clears refs on document switch

## Rule

Never cache Quill `getBounds()` results across renders. Bounds are layout-dependent.

Defer text matching to the trigger event (Ctrl press) rather than running on every content change. Use a dirty flag to signal that matches need refresh, but only compute when the overlay is actually shown.

On document change, reset all cached match state to prevent stale content from appearing in new documents.

## Accent normalization

Tag matching is accent-insensitive. Both the text and the tag are normalized using NFD decomposition + diacritic removal (U+0300-U+036F) before matching. This means "canción", "cancion", and "canción" all match the same tag. This is implemented in `removeAccents()` in `rich-markdown-editor-tag-helpers.ts`.