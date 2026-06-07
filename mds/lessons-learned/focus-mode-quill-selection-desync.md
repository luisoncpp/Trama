# Focus Mode: Quill Selection Desyncs After Programmatic Scroll

**Date:** 2026-04-23

## Symptom

Cursor disappears from Quill editor after several minutes of use, especially in focus mode. Focus appears to move to the sidebar scrollbar even though the user hasn't interacted with the sidebar.

## Root Cause

When focus mode's scroll centering programmatically sets `container.scrollTop` via `requestAnimationFrame`, Quill's internal selection state can become desynchronized from the DOM. This is because:

1. Focus mode manages scroll position via RAF callbacks triggered by `selection-change` events
2. Programmatic scroll operations don't trigger browser focus changes, but Quill's internal selection tracking can become stale
3. The repeated cycle of scroll → selection change → more scroll can destabilize Quill's selection state
4. When the selection index stored internally by Quill doesn't match the actual DOM cursor position, the cursor visually disappears

## Fix

After any programmatic scroll (`container.scrollTop = value`), explicitly restore Quill's selection:

```typescript
// Before scroll
const selection = quill.getSelection()
container.scrollTop = Math.round(target)
// After scroll - restore selection
if (selection) {
  quill.setSelection(selection.index, selection.length, 'silent')
}
```

## Files Changed

- `src/features/project-editor/components/rich-markdown-editor-focus-scope-scroll.ts` - `updateScrollRAF2()` now preserves and restores selection
- `src/features/project-editor/components/rich-markdown-editor-find-visual.ts` - `handleFocusModeMatch()` now preserves and restores selection

## Prevention

Any code that programmatically scrolls the Quill container should preserve and restore the selection to prevent desync. Always use `'silent'` flag when restoring selection to avoid triggering unintended `selection-change` events.

## Test Coverage

`tests/rich-markdown-editor-focus-rendering.test.ts` - `no muta contenido al recalcular foco repetidamente` repeatedly moves selection and verifies content stability, but does not explicitly verify cursor position. A dedicated cursor-stability test should verify `document.activeElement` stays in the editor after repeated scroll operations.