# Center Tag Editor Behavior - Implementation Plan

Date: 2026-05-14  
Status: Slice 4 complete; Slice 5 pending  
Depends on: `docs/plan/center-tag-editor-behavior-tech-design.md`

## 0. Objective

Implement two behavior fixes in rich editor center directives:

1. Deleting separator/blankspace near center boundaries must preserve intuitive center scope (boundary move/split), not raw boundary deletion.
2. Center toolbar action must be toggle/idempotent (no nested center boundaries).

## 1. Ground rules for implementation

1. Do not change markdown syntax.
2. Do not introduce nested `center:start/end` pairs.
3. Prefer transforming boundaries via Delta ops instead of direct DOM mutation.
4. Preserve pagebreak/spacer semantics.

## 2. Implementation slices

Follow these slices in order. Do not skip tests between slices.

## Slice 1 - Add center-range utility module

### Goal

Create shared logic to read and manipulate centered segments from Quill Delta.

### Files

Create:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges.ts`

### Tasks

1. Implement boundary extraction from `editor.getContents().ops`.
2. Implement centered segment derivation (`start/end` pairs).
3. Implement index-in-segment detection.
4. Implement helper to normalize selection to line range.

### Verification

1. Add temporary unit tests (or final tests if preferred) to assert:
   - simple one segment
   - multiple segments
   - malformed unclosed start
2. Run targeted test file once created:

```powershell
npx vitest run tests/rich-markdown-editor-center-toggle.test.ts
```

Expected: all tests pass for segment parsing helpers.

## Slice 2 - Implement center toolbar toggle behavior

### Goal

Replace insert-only center action with toggle semantics.

### Files

Modify:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-actions.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar-controls.ts`

### Tasks

1. Introduce `toggleCenterDirectives(editor)` in layout actions.
2. If cursor/selection outside centered scope:
   - keep existing behavior (wrap selection with start/end).
3. If cursor/selection inside centered scope:
   - remove centering from selected line(s)
   - split remaining centered content into canonical segments before/after selection when needed.
4. If cursor/selection is immediately adjacent to an existing centered segment:
   - extend that existing segment by moving the nearest boundary
   - do not create a second adjacent `center:start/end` pair.
5. Update toolbar center button click handler to call toggle function.

### Verification

1. Add tests in `tests/rich-markdown-editor-center-toggle.test.ts`:
   - inside centered middle line (split into two segments)
   - inside centered last line (left segment only)
   - outside centered line (new centered segment)
   - line directly below centered content extends the existing centered segment
   - repeated click is idempotent (no nested boundaries)
2. Run:

```powershell
npx vitest run tests/rich-markdown-editor-center-toggle.test.ts
```

Expected: no nested center boundaries and canonical output in all cases.

Slice status: completed on 2026-05-14.

Implemented in:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-actions.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar-controls.ts`
- `tests/rich-markdown-editor-center-toggle.test.ts`

## Slice 3 - Implement boundary-safe deletion behavior

### Goal

Intercept Backspace/Delete at center boundary seams and transform boundaries safely.

### Files

Modify:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-keyboard.ts`

Possibly modify (if helper reuse needed):

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges.ts`

### Tasks

1. Add keyboard bindings for `Backspace` and `Delete` with narrow guards.
2. Detect seam patterns around cursor where raw deletion would remove/stray a center boundary.
3. Replace raw deletion with boundary move/split operation:
   - merge intended paragraphs
   - re-place `center:start` or `center:end` after the merged centered block depending on seam side
4. Return `false` in keyboard handler when custom behavior applied (to prevent default).

### Verification

1. Add tests in `tests/rich-markdown-editor-center-delete-boundary.test.ts` for:
   - backspace seam between non-centered A and centered B -> expected transformed structure
   - delete seam between centered A and non-centered B -> expected transformed structure
   - ensure center does not leak to rest of document
   - delete in unrelated contexts still behaves normally
2. Run:

```powershell
npx vitest run tests/rich-markdown-editor-center-delete-boundary.test.ts
```

Expected: seam deletion preserves intuitive center scope.

Slice status: completed on 2026-05-14.

Implemented in:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-keyboard.ts`
- `tests/rich-markdown-editor-center-delete-boundary.test.ts`

## Slice 4 - Integration hardening and regressions

### Goal

Ensure new behavior integrates with serialization, clipboard, and existing editor flows.

### Files

Modify tests:

- `tests/rich-markdown-editor.test.ts`
- `tests/paste-markdown.test.ts`

Optional code touch only if required by failures:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-centering.ts`

### Tasks

1. Add integration assertions that after toggle/delete transforms, markdown serialization remains canonical comments.
2. Confirm copy-as-markdown includes expected center directives after split/toggle.
3. Confirm visual centered class sync remains correct.

### Verification

Run targeted regression suite:

```powershell
npx vitest run tests/rich-markdown-editor.test.ts tests/paste-markdown.test.ts
```

Expected: all pass; no regression in pagebreak/spacer behaviors.

Slice status: completed on 2026-05-15.

Implemented in:

- `tests/rich-markdown-editor.test.ts`
- `tests/paste-markdown.test.ts`

## Slice 5 - Full quality gates

### Goal

Ship-ready confidence.

### Verification commands

```powershell
npm run lint
npm run test
npm run build
```

Expected:

1. Lint clean.
2. All tests pass.
3. Build succeeds.

## 3. Checklist for cheaper models (strict order)

1. Create `rich-markdown-editor-layout-center-ranges.ts` with small pure helpers first.
2. Write/adjust tests for helper parsing before wiring toolbar.
3. Implement toolbar toggle in `rich-markdown-editor-layout-actions.ts`.
4. Wire toolbar button to new toggle function.
5. Implement Backspace/Delete seam guards in keyboard module.
6. Add dedicated deletion regression tests.
7. Run targeted tests after each file group change.
8. Run full lint/test/build only after targeted tests are green.

If any targeted test fails, fix immediately before moving to next slice.

## 4. Suggested commit breakdown

1. Commit A: center-range utility + helper tests.
2. Commit B: toolbar toggle behavior + toggle tests.
3. Commit C: boundary-safe deletion + deletion tests.
4. Commit D: integration regressions + quality gates.

## 5. Done criteria

Feature is done only if all are true:

1. Backspace/Delete seam behavior matches requested transform semantics.
2. Center button acts as toggle and is idempotent (no nesting).
3. Markdown serialization emits canonical center directives.
4. Existing directive features (pagebreak/spacer) remain stable.
5. Lint/test/build all green.
