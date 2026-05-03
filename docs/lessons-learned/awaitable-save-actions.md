# Awaitable Save Actions

UI actions that kick off real persistence should return a `Promise` when callers may need deterministic sequencing.

In Trama, `saveNow` is triggered from buttons and shortcuts, so fire-and-forget callers can still ignore the returned promise. But tests and composed flows need to wait until `savePaneIfDirty()` finishes its async chain (`flush -> IPC save -> markPaneSaved`).

If `saveNow` returns `void`, the save can succeed while the caller still observes pre-commit pane state (`isDirty` still `true`) because the state transition lands after the assertion or follow-up step.

Rule for future action APIs: if the action wraps async persistence and downstream code may need the post-save state, make it awaitable and let purely interactive callers discard the promise explicitly.