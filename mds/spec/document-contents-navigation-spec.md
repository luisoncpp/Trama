# Specification: Document Contents Navigation (Heading Index)

> Status: Implemented — slice 1 (2026-07-21). Deferred slices are listed in §3.2.

This specification defines the requirements and user-facing behavior for the **Contents** navigation feature: a sidebar panel that lists the current document's headings (H1–H3) and jumps the editor to a heading when an entry is clicked.

## 1. Overview

Long documents (chapters, compiled lore) are hard to navigate by scrolling alone. The Contents feature extracts the heading structure of the document open in the active editor pane and presents it as an interactive index. Clicking an entry scrolls the editor so the heading is vertically centered and places the caret at the start of the heading.

## 2. Terminology and Naming

- The sidebar rail section is named **Contents**.
- It MUST NOT be named "Outline": the sidebar already has an `outline` section scoped to the `outline/` project folder (corkboard-ordered outline documents), which is unrelated to heading navigation.
- "Heading" means a markdown ATX heading of level 1–3 (`#`, `##`, `###`) as represented in the rich editor.

## 3. Phasing

### 3.1 In scope — Slice 1 (covered by this spec's acceptance criteria)

- Contents rail section listing the headings of the active pane's document.
- Click-to-navigate with centered scroll and caret placement.
- Live list updates while typing.

### 3.2 Deferred (documented here, NOT part of slice 1 acceptance)

- Slice 2: scroll-spy highlight of the heading nearest the caret/viewport.
- Slice 3: quick-jump palette overlay (keyboard-first, compatible with focus mode).
- Slice 4: drag a heading row to reorder the corresponding document section.
- Heading-level filter chips; collapse/expand of levels.

## 4. Heading and Layout Directive Extraction Rules

The document contents list is derived from the active document's current in-memory markdown or Quill Delta ops, including unsaved changes.

1. **Levels**: only H1, H2, H3. Deeper headings are not produced by the editor and are ignored if present.
2. **Page Breaks**: explicit page break layout directives (`<!-- trama:pagebreak -->` / `<div data-trama-directive="pagebreak">`) are extracted as `pagebreak` entries (`⎘ Page Break`). Optional `label="..."` metadata replaces that Contents display text only.
3. **Spacers**: explicit spacer layout directives (`<!-- trama:spacer lines=N -->` / `<div data-trama-directive="spacer">`) and consecutive blank lines (>= 2) are extracted as `spacer` entries (`↕ Spacer (N lines)`). Optional `label="..."` metadata replaces that Contents display text only.
4. **Fenced code blocks**: lines inside ```` ``` ```` fences are never extracted.
5. **Frontmatter**: YAML frontmatter is excluded from extraction.
6. **Closed ATX**: `## Title ##` displays as `Title`.
7. **Inline formatting**: rows display plain text with markdown markers stripped (`## **Bold** _title_` → `Bold title`).
8. **Empty headings**: a heading marker with no text is omitted.
9. **Identity**: each item is identified by its ordinal position in the full document sequence (1st, 2nd, 3rd…), NOT by its text. Filtering rows does not compact or renumber ordinals; duplicate heading texts or directive items remain independently navigable.
10. **Filter Toggles**: header toggle buttons allow filtering Page Breaks or Spacers on/off in the sidebar panel. Both are activated by default.
11. **Updates**: the list refreshes automatically as the document changes; no manual refresh action exists. Update lag consistent with the editor's serialization debounce is acceptable.

## 5. Contents Panel Behavior

### 5.1 Rail section

- A new rail section **Contents** is added to the sidebar rail alongside the existing sections.
- Section selection persistence behaves like the other rail sections; no new persistence mechanism is introduced.

### 5.2 Rows

- One row per heading, in document order.
- Indentation communicates level: H1 flush left, H2 indented one step, H3 indented two steps.
- Single-line rows with ellipsis on overflow; hovering a truncated row reveals the full heading text.
- Page-break and spacer rows have a hover/focus pencil when the active pane is editable. It opens a compact label dialog. Saving an empty value removes the optional label; editing a blank-line spacer converts that spacer into the equivalent explicit directive so the metadata has a source home.
- The label is invisible in the editor canvas and reader-facing exports. It is preserved by source-oriented Copy as Markdown and AI export.

### 5.3 Empty and unavailable states

- No document open: neutral blank state.
- Document without headings: `No headings in this document.`
- Non-text documents (frontmatter `type: map` or `type: relationships`): `Contents is not available for this document type.`

### 5.4 Availability by mode

- **Focus mode**: the sidebar is hidden and locked (existing invariant); Contents is simply unavailable and must not produce errors or stale rendering when focus mode exits.
- **Fullscreen**: behaves normally (sidebar remains usable).
- **Read-only revision preview**: the panel remains usable; navigation still works (scrolling is allowed).
- **Read-only revision preview**: label pencils are hidden and no Contents mutation is allowed.

## 6. Navigation Behavior

1. Clicking a heading row:
   - scrolls the target pane's editor so the heading line sits at the vertical center of the viewport (consistent with focus-mode scroll centering),
   - places the caret at the start of the heading text,
   - moves keyboard focus to the editor.
2. **Target resolution**: by heading ordinal (see §4.7). The heading text may be used only as a sanity fallback, never as the primary key.
3. **Drift tolerance**: if the in-editor heading count differs from the extracted list, navigation clamps to the nearest available heading and never throws.
4. Navigation never modifies document content and never marks the pane dirty.

## 7. Split Pane Interaction

- The panel always reflects the **active** pane's document (`workspaceLayout.activePane`).
- Clicking inside an editor pane switches the active pane (existing behavior); the panel content updates accordingly.
- Navigation targets only the active pane's editor session; the inactive pane is never scrolled or modified.

## 8. Acceptance Criteria

1. The sidebar rail shows a **Contents** section; selecting it lists the active document's H1–H3 headings as an indented, document-ordered list.
2. Typing in the editor updates the list without manual refresh (debounced lag is acceptable).
3. Clicking a row centers that heading in the editor viewport, places the caret at the start of the heading, and focuses the editor.
4. With duplicate heading texts, each row navigates to its own occurrence.
5. Headings inside fenced code blocks and frontmatter never appear; closed-ATX headings and inline-formatted headings display as clean plain text.
6. Empty/unavailable states match §5.3 (no document, no headings, map/relationships document).
7. In split mode, the panel follows the active pane and navigation affects only that pane.
8. In read-only revision preview, navigation works; in focus mode, the panel is inaccessible without errors.
9. Navigation never marks the document dirty.
10. `npm run lint`, `npm run build`, and the focused test suite for this feature pass.
11. Labels are editable only for spacers/page breaks in an editable active pane, display only in Contents, and do not alter reader-facing exports.

## 9. Out of Scope

- Editing headings from the panel (rename, promote/demote levels).
- Section reorder via drag-and-drop (slice 4).
- Backlinks or cross-document heading aggregation.
- Table-of-contents insertion into exported books (book export has its own TOC options).

## 10. See also

- `mds/architecture/sidebar-architecture.md` — rail sections and custom panel content pattern.
- `mds/architecture/focus-mode-architecture.md` — sidebar lock invariant and scroll centering.
- `mds/architecture/split-pane-coordination.md` — active pane model and pane-targeted actions.
- `mds/architecture/document-contents-architecture.md` — subsystem design (extraction, ordinal identity, reveal, command path).
- `mds/plan/done/document-contents-navigation-implementation-plan.md` — paired slice 1 implementation plan.
