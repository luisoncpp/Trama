# Pane persistence helper should own the flush-save sequence

When split-pane editor flows need to persist content, keep the full `flush() -> fallback pane content -> saveDocumentNow()` sequence in one pane-targeted helper instead of repeating it at each call site.

Why this matters:

- `flush()` has a behavioral contract: callers must use its returned markdown directly when present.
- Different UI triggers reuse the same invariant for different panes: manual save, pane switch, file selection, autosave, and window close.
- Repeating the sequence across hooks makes it easy for one path to drift back to stale `paneState.content` or infer the wrong pane.

Effective pattern:

- centralize pane lookup and serialization-ref lookup together
- expose `flushPane(pane)`, `savePaneIfDirty(pane)`, and `saveAllDirtyPanes()`
- keep pane identity explicit at the boundary; never re-infer it inside the save helper
