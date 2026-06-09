# Alt Shortcut Key Down Interception

## Problem

When the application menu bar is configured to auto-hide and reveal itself when the user presses `Alt`, implementing this detection on `keydown` of the `Alt` key will immediately focus or show the menu bar (e.g. calling `Menu.popup()` on Windows).
This interception happens before the user can press a subsequent shortcut key (like `ArrowLeft` or `ArrowRight` for back/forward navigation history). As a result, standard modifier shortcuts like `Alt+Left` and `Alt+Right` are broken or swallowed because the menu bar grabs focus.

## Solution

To allow modifier shortcuts to continue working seamlessly, the bare `Alt` detection must follow standard OS behavior:
1. **KeyDown of Alt**: Reset a flag `otherKeyPressed = false` and mark Alt as held down.
2. **KeyDown of any other key**: If Alt is held down, set `otherKeyPressed = true`.
3. **KeyUp of Alt**: If `otherKeyPressed` is `false`, the user tapped the bare `Alt` key. Reveal the menu bar. If `otherKeyPressed` is `true`, a shortcut was triggered; ignore the keyup event and do not reveal the menu bar.
4. **Window Blur**: Reset the state when the window loses focus to prevent stuck state if Alt was released outside the window.

This must be implemented symmetrically in the main process (using Electron's `before-input-event` listener on `webContents`) and the renderer (using standard event listeners on `window`).
