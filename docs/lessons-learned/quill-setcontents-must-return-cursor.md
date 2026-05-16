# Quill: setContents Helpers Must Return the Cursor Position

**Date:** 2026-05-15

## Symptom

Cursor disappears from Quill editor after a toolbar action (e.g., clicking center button). Focus shifts to the scrollbar or another focusable element. The trigger is consistent: place cursor on a line adjacent to a centered block, click center.

## Root Cause

`setContents` replaces the entire document. Any index computed from the old document (line ranges, segment boundaries) becomes stale after the replacement — it may now point to a `contentEditable="false"` embed where Quill cannot render a visible cursor.

This is the same class of bug as the scroll desync in `focus-mode-quill-selection-desync.md`, but triggered by Delta application instead of programmatic scroll. The pattern is: **any helper that builds and applies a Delta via `setContents` or `updateContents` must also compute and return the correct cursor position for the new document structure.**

## Fix

Delta-building helpers return `{ delta, cursorIndex }` instead of bare `Delta`. The cursor position is computed from the new Delta's structure, not from stale old-document indices.

```typescript
// Before (broken)
function buildToggleDelta(editor, oldRange): Delta { ... }
// ...
const delta = buildToggleDelta(editor, oldRange)
editor.setContents(delta, 'user')
editor.setSelection(oldRange.endIndex - 1, 0, 'silent') // stale index

// After (fixed)
function buildToggleDelta(editor, oldRange): { delta: Delta; cursorIndex: number } { ... }
// ...
const result = buildToggleDelta(editor, oldRange)
if (result) {
  editor.setContents(result.delta, 'user')
  editor.setSelection(result.cursorIndex, 0, 'silent')
}
```

## Files Changed

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-actions.ts` — `buildExtendedCenterContents` and `buildToggledCenterContents` now return `{ delta, cursorIndex }`; `toggleCenterDirectives` uses the returned cursor index

## Prevention

Any helper that calls `editor.setContents()` or `editor.updateContents()` with a structurally different Delta should return the correct cursor position alongside the Delta. The caller must use the returned cursor index, never a stale index from the old document. When restoring selection, use `'silent'` to avoid triggering unintended `selection-change` events.

## Test Coverage

`tests/rich-markdown-editor-center-toggle.test.ts` — cursor position assertions after center toggle verify the cursor lands on text (not on an embed) for extend-below, extend-above, and toggle-inside-center paths.
