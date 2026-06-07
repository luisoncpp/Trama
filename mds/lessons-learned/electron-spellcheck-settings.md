# Electron spellcheck settings

- Electron spellcheck configuration is runtime-settable through `webContents.session`, not just `BrowserWindow.webPreferences` at creation time.
- Use `session.setSpellCheckerEnabled()` for the global toggle and `session.setSpellCheckerLanguages()` only on Windows/Linux.
- On macOS, language selection is managed by the OS spellchecker, so renderer settings should expose only enable/disable plus a note that language selection is unavailable.