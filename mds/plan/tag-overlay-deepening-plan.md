# Tag Overlay Deepening Plan

Date: 2026-04-29

## Context

Tag overlay (wiki tag links underline rendering) has accumulated architectural debt:

1. `TagMatch` indices are plain-text but not typed as such — `mapPlainTextIndexToQuillIndex` is duplicated in 4+ places
2. `EditorSerializationRefs` mixes serialization and tag overlay state
3. `useTagOverlay` mutates caller's refs as a side effect — caching is invisible in the interface
4. `findTagMatchesInText` core matching algorithm has no dedicated unit tests

This plan addresses items 1-4 from the architecture review.

## Index

| # | File | Scope | Status |
|---|------|-------|--------|
| 1 | `tag-overlay-index-types-plan.md` | Branded index types + consolidate conversion | pending |
| 2 | `tag-overlay-state-seam-plan.md` | Extract tag overlay state from `EditorSerializationRefs` | pending |
| 3 | `tag-overlay-hook-interface-plan.md` | Refactor `useTagOverlay` to expose explicit recompute | pending |
| 4 | `tag-overlay-helpers-tests-plan.md` | Add unit tests for `findTagMatchesInText` and helpers | **done** |

## High-value next task

Items 1-3 are pending. Item 1 (branded index types) is the recommended next step — it enables safer refactoring of items 2 and 3 by making index spaces explicit at the type level.

---

## Item 4: Unit tests for tag-helpers

**Status**: done ✓

**Scope**: `tests/tag-match-helpers.test.ts`

**Deliverables**: 51 tests covering:
- `removeAccents` — NFD decomposition, diacritics, edge cases
- `escapeRegExp` — special regex characters
- `isInsideCodeBlock` — triple backticks, inline backticks, indented lines, mixed scenarios (11 tests)
- `findTagMatchesInText` — word boundaries, accent normalization, case insensitivity, overlap/longest-match, positions, empty edge cases (32 tests)
- `filterMatchesOutsideCode` — integration with code block filtering (7 tests)

---

## Item 1: Branded index types + consolidated index conversion

**Status**: pending

**Problem**: `TagMatch.start/end` are plain-text indices but there's no type distinction. `mapPlainTextIndexToQuillIndex` is duplicated in `tag-overlay.ts`, `tag-highlights.tsx`, `find-state.ts`, `find-visual.ts`.

**Solution**:
- Introduce branded types `PlainTextIndex` and `QuillIndex`
- TagMatch uses `PlainTextIndex` for its offsets
- `mapPlainTextIndexToQuillIndex` is the single conversion function
- Remove duplication in `tag-highlights.tsx` and find modules

**Files touched**: `tag-overlay.ts`, `tag-highlights.tsx`, `rich-markdown-editor-find-state.ts`, `rich-markdown-editor-find-visual.ts`

---

## Item 2: Extract tag overlay state from EditorSerializationRefs

**Status**: pending

**Problem**: `EditorSerializationRefs` carries `flush()` (its stated purpose) plus `tagOverlayRecalcRef` and `tagOverlayMatchesRef`. Serialization module sets the dirty flag — it knows about tag overlay internals.

**Solution**:
- Create `TagOverlayState` interface in `tag-overlay.ts`
- `EditorSerializationRefs` does not reference tag overlay state
- Serialization calls `onEditorContentChanged()` callback — tag overlay registers the callback that sets its own dirty flag
- Seam: serialization emits events, tag overlay consumes them

**Files touched**: `project-editor-types.ts`, `tag-overlay.ts`, `rich-markdown-editor-serialization.ts`, `rich-markdown-editor.tsx`

---

## Item 3: Refactor useTagOverlay to expose explicit recompute

**Status**: pending

**Problem**: Hook writes to caller's refs as side effects. `ctrlPressed` gating is entangled inside the hook. Non-reusable for non-ctrl-key scenarios.

**Solution**:
- Return `(matches: TagMatch[], recompute: () => void)` from the hook
- Or return a `TagOverlayState` object that encapsulates matches and dirty flag
- Move `ctrlPressed` gating to the caller (component level decides when to trigger)
- Tests can drive the state machine without simulating key events

**Files touched**: `tag-overlay.ts`, `rich-markdown-editor.tsx`

---

## Dependencies

Items 1, 2, 3 are independent of each other but all depend on having the test coverage from item 4 first.

Item 4 (tests) is standalone and can proceed immediately.