# Center-end seam delete uses boundary adjacency, not deleted text inference

Date: 2026-05-14

## What to know

For center-boundary-safe deletion in Quill, the reliable signal is the collapsed selection index adjacent to the `center:end` embed.

Do not try to infer the operation from a "deleted newline" model.

## Why this matters

At the seam between centered and non-centered content, Quill treats the center boundary as an embed with document length `1`.

- Backspace from the first non-centered line targets the previous embed.
- Delete on the seam targets the `center:end` embed directly.

If the handler watches plain-text structure instead of embed adjacency, it misses the real seam and the default delete removes the boundary, leaking centering into later lines.

## Effective rule

Guard on narrow document-index patterns:

- Backspace: `selection.index === segment.endBoundaryIndex + 1`
- Delete: `selection.index === segment.endBoundaryIndex`

When matched, move the `center:end` boundary after the next non-centered line and leave later lines outside the centered segment.

## Where this applied

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-keyboard.ts`
- `tests/rich-markdown-editor-center-delete-boundary.test.ts`

## Fast regression check

```powershell
npx vitest run tests/rich-markdown-editor-center-delete-boundary.test.ts
```
