# Center Tag Editor Behavior - Technical Design

Date: 2026-05-14  
Status: Proposed  
Scope: Rich editor center-directive UX hardening (`trama:center:start/end`)

## 1. Problem Statement

Current center-tag behavior in the rich editor has two UX failures:

1. Center boundary directives are deletable as normal content (similar to embeds/images), so deleting one boundary can unexpectedly re-scope centering for the rest of the document.
2. Center toolbar action is not toggle/idempotent. Clicking center inside already-centered content inserts nested center boundaries instead of splitting/removing center intent.

These produce data-loss-like surprises and make the editor model feel unstable.

## 2. Goals

1. Prevent accidental center-scope corruption when editing at boundary joins.
2. Make center action deterministic and toggle-like when cursor is inside an already centered block.
3. Keep markdown canonical serialization unchanged (`<!-- trama:center:start -->` / `<!-- trama:center:end -->`).
4. Preserve current behavior for pagebreak/spacer directives.

## 3. Non-goals

1. No new markdown syntax.
2. No nested center support.
3. No toolbar UI redesign.
4. No broad rewrite of layout directive architecture.

## 4. Target UX Semantics

## 4.1 Backspace/Delete near center boundaries

When deletion occurs at a seam between centered and non-centered paragraphs (specifically the blank line/separator between `center:end` and following content), the editor must transform structure instead of removing a center boundary.

Expected transform:

```md
<!-- trama:center:start -->
Content A
<!-- trama:center:end -->
Content B
Content C
```

After deleting the separator between `A` and `B`:

```md
<!-- trama:center:start -->
Content A
Content B
<!-- trama:center:end -->
Content C
```

Interpretation: move the nearest relevant `center:end` boundary down to preserve intuitive paragraph merge behavior, rather than deleting boundary artifacts.

## 4.2 Center toolbar toggle behavior

If selection/cursor is inside already-centered content:

- Clicking center removes centering for the current block/line and splits one centered region into two centered regions around the toggled block when needed.

Example (cursor in `B`):

```md
<!-- trama:center:start -->
A
B
C
<!-- trama:center:end -->
```

Becomes:

```md
<!-- trama:center:start -->
A
<!-- trama:center:end -->
B
<!-- trama:center:start -->
C
<!-- trama:center:end -->
```

If cursor in trailing line (`C`) of:

```md
<!-- trama:center:start -->
A
B
<!-- trama:center:end -->
C
```

Center toggle should apply centering to `C` by creating/adjusting boundaries in canonical non-nested form.

## 5. Architectural Approach

Use a boundary-aware center range model derived from Quill Delta, then route editor actions (toolbar + keyboard deletion) through this model.

Core concept:

- Treat center directives as delimiters of a virtual "centered range" over content lines.
- Mutations should edit range boundaries, not raw embed nodes directly.

### 5.1 New module: center range model

Create:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges.ts`

Responsibilities:

1. Parse editor contents (`editor.getContents().ops`) into ordered boundary tokens and content block anchors.
2. Compute whether a given index/line is inside centered scope.
3. Find enclosing centered segment for cursor/selection.
4. Build boundary-move operations for:
   - split centered segment around current line
   - extend/shrink centered segment
   - preserve non-nested canonical ordering

Public API (proposal):

1. `getCenterSegments(editor): CenterSegment[]`
2. `findCenterSegmentAtIndex(editor, index): CenterSegment | null`
3. `buildToggleCenterOps(editor, selection): Delta`
4. `buildBoundarySafeDeleteOps(editor, selection, direction): Delta | null`

### 5.2 Modify center toolbar action pipeline

Modify:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-actions.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar-controls.ts`

Changes:

1. Replace direct `insertCenterDirectives(...)` usage with `toggleCenterDirectives(...)`.
2. `toggleCenterDirectives` decides:
   - outside center -> insert boundaries around selected lines (current behavior baseline)
   - inside center -> split/remove center for selected lines using range ops
3. Ensure operation remains single undo step.

### 5.3 Add keyboard boundary-safe deletion handling

Modify:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-keyboard.ts`

Changes:

1. Add Backspace/Delete bindings specifically for center-boundary edge conditions.
2. On matching condition, prevent raw deletion and apply boundary-safe transform Delta.
3. Reuse existing pagebreak navigation behavior without regression.

### 5.4 Keep centering visual sync as projection

Modify (small):

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-centering.ts`

Changes:

1. No rule change in styling model; only ensure post-transform sync runs after new toggle/delete ops.
2. Keep directive nodes non-centered, content nodes centered based on boundary walk.

### 5.5 Serialization and clipboard compatibility

Likely no logic change required, but verify with tests:

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-quill.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-clipboard.ts`
- `src/shared/markdown-layout-directives.ts`

Reason: boundaries remain the same directive embeds/comments, only placement changes.

## 6. Data Model Details

Proposed internal types (new file):

```ts
interface CenterBoundary {
  index: number
  role: 'start' | 'end'
}

interface CenterSegment {
  startBoundaryIndex: number
  endBoundaryIndex: number
  contentStartIndex: number
  contentEndIndexExclusive: number
}
```

Invariant checks:

1. No nested segments in produced operations.
2. Start must precede end.
3. Toggling a line inside a segment yields either:
   - left segment only
   - right segment only
   - both (split)
   - none (segment fully removed)

## 7. Edge Cases

1. Cursor exactly on a boundary embed.
2. Selection spanning multiple lines inside one centered segment.
3. Selection crossing segment boundary.
4. Document with malformed boundaries from legacy content.
5. First/last line toggles inside centered segment.
6. Undo/redo after split operations.

Policy for malformed structures:

- Be conservative: avoid destructive rewrite; apply minimal operation or no-op when safe canonical transform cannot be guaranteed.

## 8. Test Strategy (Architecture-level)

Modify/add:

1. `tests/rich-markdown-editor.test.ts`
   - center toggle split behavior
   - boundary-safe deletion behavior
2. `tests/paste-markdown.test.ts`
   - copy/serialize remains canonical after toggle/split
3. New: `tests/rich-markdown-editor-center-toggle.test.ts`
   - pure behavior matrix for toggle states
4. New: `tests/rich-markdown-editor-center-delete-boundary.test.ts`
   - deletion near boundary transformations

## 9. File-level Change List

Create:

1. `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges.ts`
2. `tests/rich-markdown-editor-center-toggle.test.ts`
3. `tests/rich-markdown-editor-center-delete-boundary.test.ts`

Modify:

1. `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-actions.ts`
2. `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-keyboard.ts`
3. `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar-controls.ts`
4. `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-centering.ts` (if needed for post-op sync consistency)
5. `tests/rich-markdown-editor.test.ts`
6. `tests/paste-markdown.test.ts`

## 10. Risks and Mitigations

1. Risk: Quill index math drift with embeds.
   - Mitigation: base all transforms on Delta ops, not plain text offsets.
2. Risk: keyboard binding conflicts with existing pagebreak bindings.
   - Mitigation: register explicit key handlers with precise guards.
3. Risk: malformed legacy docs produce unexpected transforms.
   - Mitigation: guarded no-op fallback + warnings in tests.
4. Risk: non-idempotent toolbar operations due to selection ambiguity.
   - Mitigation: normalize selection to full line range before toggle.

## 11. Acceptance Criteria

1. Deleting between centered and non-centered paragraphs preserves boundaries by moving/splitting scope, not removing center semantics unexpectedly.
2. Clicking center inside centered content acts as toggle and never produces nested center boundaries.
3. Resulting markdown serialization remains canonical directive comments.
4. Existing pagebreak/spacer behaviors and tests remain green.
