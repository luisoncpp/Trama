# Focus mode in Rich Markdown Editor: highlight vs overlay

Date: 2026-04-05

## Context

Focus mode (`line | sentence | paragraph`) went through several iterations where visual behavior looked plausible but regressed in stability or readability.

## What worked

- Use CSS Highlights API as primary path for `line` and `sentence`:
  - Build a DOM `Range` from line-relative offsets.
  - Register it in `CSS.highlights` with a stable key.
  - Style with `::highlight(...)`.
- Keep non-mutating emphasis fallback (`is-focus-emphasis`) when Highlights API is unavailable.
- Keep `paragraph` as block-level emphasis.

## Why `is-focus-text-highlight` must stay

- It is an explicit runtime marker for the highlight path, even if it does not drive CSS directly.
- In JSDOM we cannot trust visual assertions for `::highlight(...)`; this marker is the reliable observable for tests.
- Removing it tends to hide regressions because behavior can silently move to fallback without obvious test failure.

## Why this worked

- Highlights API affects text glyph perception directly, matching expected focus behavior better than background-only effects.
- Fallback overlay preserves compatibility without making focus disappear on runtimes lacking highlight support.
- No content mutation inside Quill-managed DOM, so Delta/content integrity is preserved.

## What failed and why

- Injecting wrapper or overlay nodes into `.ql-editor`:
  - Interfered with Quill ownership of DOM/content.
  - Triggered side effects like blank lines growth and unstable editing behavior.
- Overlay-only strategy:
  - Visually emphasized background more than text.
  - Produced a paragraph-like dim look instead of clear sentence/line focus.
- Removing state marker during cleanup:
  - The marker looked redundant (no direct CSS consumer), but its removal reduced observability in tests and made regressions easier to miss.
- Keeping all logic in `rich-markdown-editor.tsx`:
  - Increased coupling and repeatedly violated lint size constraints.
  - Slowed debugging and made regressions easier.

## Misunderstandings to avoid

- `rich-markdown-editor.tsx` is not the right place for complex focus rendering internals; use dedicated hook/helper modules.
- Quill rendered DOM should be treated as non-owned for structural edits.
- A single rendering technique is not sufficient across runtimes; capability detection + fallback is required.

## Guardrails

- Any focus visual change must be non-mutating relative to Quill content.
- Preserve the rendering order: try highlight first, then fallback overlay.
- Preserve the rendering order: try highlight first, then fallback emphasis.
- Keep `is-focus-text-highlight` as test-observable state for the highlight path.
- Re-run focus tests plus rich editor tests after changes.
