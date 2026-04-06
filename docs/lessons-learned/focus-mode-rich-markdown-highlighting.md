# Focus Mode in Rich Markdown Editor: Why This Fix Worked

Date: 2026-04-05

## Context

Focus mode (`line | sentence | paragraph`) regressed multiple times during WS3 stabilization. Several iterations visually looked close, but produced one or more of these failures:

- `sentence` and `line` looked like `paragraph`.
- focus highlight looked like background paint, not text emphasis.
- editor instability and content corruption symptoms (for example: unexpected blank lines growth).
- lint rule pressure (`max-lines`) repeatedly forced risky in-place rewrites.

The restored GitHub version stabilized behavior by combining text highlight, geometry fallback, and strict separation of responsibilities.

## Why This Fix Works

The current approach in `rich-markdown-editor-focus-scope.ts` + `rich-markdown-editor-focus-scope-geometry.ts` works because it respects Quill and browser constraints in this exact order:

1. `paragraph` scope remains block-level (`is-focus-emphasis`) with no inline mutation.
2. `sentence` and `line` compute boundaries from the active line.
3. It first attempts glyph-level emphasis using CSS Highlights API (`CSS.highlights` + `Highlight`).
4. If unsupported/unavailable, it falls back to geometry (`Range.getBoundingClientRect`) and overlay painting.
5. If geometry is unavailable, it falls back to Quill bounds and finally line box bounds.
6. Refresh is scheduled with `requestAnimationFrame` for `selection-change` and `text-change` to avoid stale/duplicated paints during fast updates.
7. Cleanup always removes previous highlight/overlay/classes when scope or mode changes.

This layered fallback model gives correctness first, compatibility second, and visual continuity third.

## Why Other Attempts Failed

The failed iterations mostly broke one of these invariants:

1. **Content immutability invariant**
   Adding/removing DOM nodes inside `.ql-editor` to "paint" focus can interfere with Quill's model-to-DOM assumptions. This caused instability and corruption-like symptoms.

2. **Text-vs-background emphasis invariant**
   Several overlays only painted a rectangle behind text. Users perceived this as "same as paragraph" because glyph contrast did not change enough.

3. **Scope semantics invariant**
   Some line/sentence calculations were effectively paragraph-level in practice (or not visually distinguishable), so behavior looked wrong even when code paths differed.

4. **Decomposition invariant (lint-driven)**
   Repeated hotfixes inside `rich-markdown-editor.tsx` violated `max-lines`, forcing rushed rewrites. Stability improved only after scope logic moved into dedicated modules.

## RichMarkdownEditor Misunderstandings (Explicit)

These were the main misunderstandings and the corrected view:

1. Misunderstanding: `.ql-editor` is safe as a free-form rendering container.
   Correct: it is controlled by Quill; avoid structural DOM mutations for visual effects.

2. Misunderstanding: any overlay that "marks area" is equivalent to text highlighting.
   Correct: users distinguish glyph-level emphasis from background tinting; CSS Highlights API better matches expected behavior.

3. Misunderstanding: sentence/line visual parity can be solved in CSS only.
   Correct: robust behavior requires correct runtime boundary math plus CSS, not CSS alone.

4. Misunderstanding: fallback can be omitted if primary path works locally.
   Correct: runtime support differs; fallback is required to avoid disappearing focus in unsupported environments.

## Guardrails for Future Changes

1. Do not inject wrapper nodes into Quill content for focus rendering.
2. Keep focus-scope logic outside `rich-markdown-editor.tsx` to satisfy lint and reduce regression risk.
3. Preserve layered strategy: text highlight first, then geometry overlay, then bounds fallback.
4. When touching focus visuals, verify manually in all three scopes and run:
   - `npm run lint`
   - `npm test -- --run tests/focus-mode-scope.test.ts tests/rich-markdown-editor.test.ts`
