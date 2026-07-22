# Quill setSelection() always DOM-focuses the root (even with 'silent')

## What to know

`editor.setSelection(index, length, source)` routes to `Selection.setRange` → `setNativeRange`, which runs `if (!this.hasFocus()) this.root.focus({ preventScroll: true })` (`quill/core/selection.js`). There is no way to place a caret without a DOM focus attempt — even with `Emitter.sources.SILENT`.

## Why it matters

- In a real browser this is harmless for disabled/read-only editors: `root.focus()` on a `contenteditable=false` div without `tabindex` is a no-op, so skipping the explicit `editor.focus()` call still guarantees no focus steal.
- In **jsdom** the same `root.focus()` sticks even on `contenteditable=false` roots, so `editor.hasFocus()` returns `true` after any `setSelection`. Asserting "no focus" in a jsdom test fails for reasons unrelated to your code.

## Effective rule

- When a feature must not move keyboard focus (e.g. read-only revision preview reveal), skip the explicit `editor.focus()` call when `!editor.isEnabled()`; do not try to suppress `setSelection`'s internal focus attempt.
- In tests, assert `vi.spyOn(editor, 'focus')` was not called instead of `editor.hasFocus() === false`.
- Related: `Range.prototype.getBoundingClientRect` does not exist in jsdom — polyfill it in `beforeEach` before any `editor.getBounds()`/`focus()` call (pattern in `tests/document-contents-reveal.test.ts`).

Discovered while implementing Contents heading reveal (`src/features/project-editor/document-contents/private/quill-heading-reveal.ts`); covered by the "skips focus but still reveals when the editor is disabled" test in `tests/document-contents-reveal.test.ts`.
