# Spellcheck optimistic toggle sync

- Electron spellcheck toggles can look broken if the renderer waits for an immediate native reread after calling `session.setSpellCheckerEnabled()`.
- For settings toggles, prefer optimistic renderer updates with rollback on IPC failure.
- Main-process spellcheck handlers should return normalized state that reflects the requested toggle, rather than depending exclusively on an immediate post-write reread.
- This avoids checkbox bounce and keeps renderer state aligned with what the user just asked the app to do.