# Focus mode centered scroll: reliable edge spacing in Quill

Date: 2026-04-07

## Context

Focus mode needed typewriter-style centering in the rich Quill editor: the active line should stay visually centered, including near the first and last lines of the document.

This took longer than expected because multiple plausible implementations appeared correct in code, passed partial tests, and still failed visually at the end of the document.

## What worked

- Compute the active caret/selection position from real DOM geometry with `Range.getBoundingClientRect()` in `getSelectionViewportRect(...)`.
- Keep the scroll calculation in the scroll container (`.ql-container`) but apply extra top/bottom space on the editor content (`.ql-editor`).
- Implement the extra edge space as real block spacers using `.ql-editor.is-focus-mode::before` and `.ql-editor.is-focus-mode::after` with heights driven by `--focus-extra-top` and `--focus-extra-bottom`.
- Recompute target scroll after the extra spacing has been applied, using a second `requestAnimationFrame`.

## What failed and why

- Using `quill.getBounds()` as the primary source for centering:
  - It returns editor-relative geometry, not true viewport geometry.
  - This caused visible drift where the caret moved faster than the scrollbar.
- Adding `paddingTop` / `paddingBottom` directly on `.ql-container`:
  - `.ql-container` is the scroll element.
  - Its `clientHeight` includes its own padding.
  - The centering formula used `container.clientHeight`, so each recalculation read a distorted viewport height and produced weird scrollbar behavior and broken top spacing.
- Encoding the extra edge space only inside `.ql-editor` padding calculations:
  - The CSS variable updated correctly, but in this Quill layout it did not reliably translate into the expected extra scrollable area at EOF.
  - Logs showed `--focus-extra-bottom` increasing while `maxScroll` still stayed too small, so the target scroll remained clamped.

## Debugging signals that mattered

- Logging both RAF passes was necessary.
- The useful fields were:
  - `desired`
  - `maxScroll`
  - `scrollHeight`
  - computed `--focus-extra-bottom`
- The key symptom was: extra bottom spacing was being requested, but `target` still clamped to `maxScroll` because the scrollable height did not grow enough.

## Misunderstandings to avoid

- Do not assume that changing a CSS variable used in editor padding is enough to create usable EOF space in Quill.
- Do not modify the padding of the scroll container when the centering math depends on `clientHeight`.
- Do not trust `quill.getBounds()` alone for viewport-centric centering behavior.

## Guardrails

- Treat `.ql-container` as the viewport and `.ql-editor` as the content.
- Keep edge spacing on the content side, not on the scroll container.
- Prefer real spacer blocks or pseudo-elements over container padding for typewriter-style top/bottom breathing room.
- If EOF spacing regresses, inspect `desired`, `maxScroll`, and `scrollHeight` before changing formulas.