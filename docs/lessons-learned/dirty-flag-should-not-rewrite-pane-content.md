# Dirty Flag Should Not Rewrite Pane Content

## What to know

If a rich editor needs an immediate dirty signal and a later debounced content sync, those must be separate pane mutations.

Using one `updatePaneContent(...)` path for both concerns looks simpler, but it creates avoidable state churn:

- the first keystroke legitimately flips `isDirty` to `true`
- later keystrokes still call the same state setter even when content has not changed yet
- the hook tree re-runs for work that carries no new information

## Effective pattern

Split the typing path into two explicit operations:

1. `markPaneDirty(pane)` for the immediate signal
2. `updatePaneContent(pane, content)` for the debounced serialized content

The dirty-only operation must return the previous pane object when `isDirty` is already `true`.

## Why this matters here

`useProjectEditor()` owns pane state, so every pane write re-runs the composition root. If the editor sends a dirty-only signal on each keystroke, that signal must not masquerade as a content update.

## When this applies

- Rich text editors with debounced serialization
- Split-pane editors where pane-local state changes are expensive
- Any model where the same callback is tempted to mean both "this document is dirty" and "here is the new content"
