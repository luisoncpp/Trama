# Sandboxed help preload cannot import local helper modules

Electron 20+ sandboxes renderer preloads when `webPreferences.sandbox` is `true`. In that mode, `require` is polyfilled and **cannot load local files** — only `electron` and a small Node built-in subset.

Trama's help preload (`electron/help-preload.cts`) imports envelope helpers from `src/shared/help-getting-started-ipc-bridge.ts`. With `sandbox: true`, that import fails, the preload never runs, and `window.tramaHelpApi` is never exposed. The Getting Started checkbox then toggles visually but never calls IPC; dismissal is never persisted.

Symptoms:
- Checkbox always loads unchecked after restart.
- Checking it appears to work in-session but auto-open returns on next launch.
- No obvious renderer error unless DevTools is open on the help window.

Fix options:
1. Set `sandbox: false` on the help `BrowserWindow` (what Trama uses — same as the main window).
2. Inline all preload logic into a single file with no local imports.
3. Bundle the preload with webpack/esbuild into one file.

Rule: before adding a `require`/`import` to any preload, check the target window's `sandbox` flag. Child-window preloads that need shared helpers either stay unsandboxed or must be bundled.
