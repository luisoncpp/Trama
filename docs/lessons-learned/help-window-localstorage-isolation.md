# Help window localStorage is isolated from the main window

Each Electron `BrowserWindow` has its own `localStorage` storage area. Trama's help child window (`electron/main-process/help-window.ts`) and the main workspace window therefore do **not** share a `localStorage` namespace even when the help page is served from the same origin.

Consequence: a preference like `trama.help.getting-started.dismissed.v1` cannot be read or written from `help/en/*.html` via direct `localStorage` calls. The help page must ask the main process to run an `executeJavaScript` snippet against the **main** window's `webContents` and return the result.

Pattern for any cross-window preference:

1. Define the storage key once in `src/shared/` (e.g. `src/shared/help-storage-key.ts`).
2. Expose a get/set IPC pair from the main process; the handlers always target the **main** window's `webContents`, never the source window's.
3. Expose the pair on the help window's preload (`electron/help-preload.cts`) under a dedicated `window.tramaHelpApi` namespace.
4. Help pages call the bridge from their inline scripts. Renderer-side consumers (e.g. `useAutoOpenGettingStartedEffect`) keep reading the main window's `localStorage` directly via the existing helper.

A check-only bridge (write `'true'`, no read, no uncheck) is not enough for a two-way checkbox: the page cannot reflect the saved state on load and cannot persist the uncheck. Always model a boolean preference as a symmetric get/set pair.
