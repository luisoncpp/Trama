# Adjacent center toggle should extend the existing segment

Date: 2026-05-14

## What to know

When the user centers a paragraph immediately above or below an already centered block, the correct model is to extend the existing centered segment by moving one boundary.

Do not create a second adjacent `center:start/end` pair.

## Why this matters

Two adjacent centered segments serialize correctly, but they make the editor model noisier than necessary and create avoidable boundary seams that the user never intended.

If the visual result is one continuous centered block, the document model should also stay one continuous centered block.

## Effective rule

Before falling back to "insert a new center pair", check whether the normalized line range is directly adjacent to an existing centered segment:

- if it sits immediately after `center:end`, move that `center:end` down
- if it sits immediately before `center:start`, move that `center:start` up

Only create a fresh pair when the selected line is not adjacent to any centered segment.

## Where this applied

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-actions.ts`
- `tests/rich-markdown-editor-center-toggle.test.ts`

## Fast regression check

```powershell
npx vitest run tests/rich-markdown-editor-center-toggle.test.ts
```
