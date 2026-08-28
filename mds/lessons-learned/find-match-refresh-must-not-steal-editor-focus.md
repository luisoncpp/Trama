# Find match refresh must not steal editor focus

Date: 2026-08-10

## Context

The in-document find bar stays open while the user edits. `useContentMutatedRefreshEffect()` recomputes match positions on every editor mutation so counts and highlights stay accurate.

## Counter-intuitive behavior

`useActiveMatchOverlayEffect()` also runs when `state.matches` changes. It was calling `revealActiveMatch()` and `keepFindFocus()` on every match refresh — including refreshes triggered by typing in the editor body.

Typing a search term into the document therefore re-ran the reveal loop and moved focus back to the find input, even though the user had already clicked into the editor.

## Rule

Match refresh and match reveal are different intents:

- **Refresh** (content mutation while the editor body is focused and the query is unchanged): update `matches` / overlay bounds only; do not change editor selection, scroll, or focus.
- **Reveal** (find-bar interaction or query change): scroll to the active match and keep focus in the find bar when it already has focus.

In `useActiveMatchOverlayEffect`, call `refreshFindBounds()` on every match update, but skip `revealActiveMatch()` and `keepFindFocus()` when `isEditorBodyFocused()` is true **and** the query did not change in that effect run. Capture `isFindBarFocused()` before `revealActiveMatch()`; when the find bar is focused, skip `editor.setSelection()` and scroll to the match using bounds instead.

`jumpMatch` / replace must **not** call `editor.setSelection` themselves. `setSelection` always DOM-focuses the Quill root (even with `'silent'`), which makes `isEditorBodyFocused()` true so `keepFindFocus()` bails and Enter/Next navigation leaves the caret in the editor. Leave selection and scroll to `revealActiveMatch` via the overlay effect.

`keepFindFocus()` must also bail out when the editor body already has focus, so stale `setTimeout(0)` callbacks from earlier find-bar typing cannot steal focus after the user clicks back into the document.

## Focused tests

`npm run test -- tests/rich-markdown-editor-find-regression.test.ts`
