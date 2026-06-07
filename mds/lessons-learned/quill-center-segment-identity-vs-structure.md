# Quill Center Segment Identity vs Structure

Date: 2026-05-14

## What to know

When a helper recomputes center segments from `editor.getContents().ops`, each lookup returns fresh objects.

Comparing two `CenterSegment` values with reference equality (`===`) is incorrect even when both refer to the same centered region.

## Why this matters

Center toggle needs to decide whether the normalized selection start and end fall inside the same centered segment.

If the code compares the two lookup results by object identity, the check fails and the toolbar falls back to the outside-center path. That creates nested `center:start/end` boundaries instead of toggling the existing centered block.

## Effective rule

Compare center segments structurally:

- `startBoundaryIndex`
- `endBoundaryIndex`

If those match, treat them as the same segment.

## Where this applied

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-actions.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges.ts`
- `tests/rich-markdown-editor-center-toggle.test.ts`

## Fast regression check

```powershell
npx vitest run tests/rich-markdown-editor-center-toggle.test.ts
```

If inside-center toggle starts nesting boundaries again, check for accidental reference comparisons between recomputed segment objects.
