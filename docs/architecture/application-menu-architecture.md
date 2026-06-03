# Application Menu — Architecture

Date: 2026-05-14

## Context

Electron's default application menu includes zoom controls (View → Zoom In, Zoom Out, Reset) in the native menu bar that appears when pressing Alt. Trama implements its own custom zoom feature (CSS `zoom` on the Quill editor container, controlled via toolbar dropdown and keyboard shortcuts Ctrl++/Ctrl-). Having two independent zoom mechanisms in the same application creates user confusion.

## Problem

When a user presses Alt, the native Electron menu bar appears with a View menu containing zoom options (Zoom In, Zoom Out, Reset). These Electron-native zoom shortcuts compete with Trama's custom zoom implementation:
- Electron's native zoom scales the entire window/browserView
- Trama's zoom (in the toolbar) only scales the Quill editor container via CSS `zoom`

The solution cannot be to disable the application menu entirely via `Menu.setApplicationMenu(null)` because that would also remove the native context menu (right-click) which provides workspace commands (toggle split, toggle fullscreen, toggle focus mode).

## Solution

Replace Electron's default application menu with a custom template that:
- **Keeps**: File (close), Edit (undo, redo, cut, copy, paste, selectAll), View (Back, Forward, toggleDevTools, togglefullscreen), Help
- **Removes**: Zoom controls from the View menu; Window menu entirely

The custom menu is applied via `Menu.setApplicationMenu(Menu.buildFromTemplate(template))`.

The `autoHideMenuBar: true` setting in `window-config.ts` is preserved — the menu bar still hides and appears on Alt press, but now it shows the custom template without zoom options.

On Windows with `titleBarStyle: 'hidden'`, Electron does not paint a native menu strip. Pressing **Left Alt** in the renderer calls `tramaApi.revealMenuBar()` (IPC), and the main process opens the application menu via `Menu.popup()` at the top-left. On macOS/Linux, the native auto-hidden menu bar is shown with `setMenuBarVisibility(true)` instead.

## Key Files

| File | Role |
|------|------|
| `electron/main-process/application-menu.ts` | Defines and applies the custom `Menu.setApplicationMenu()` template |
| `electron/main-process/menu-bar-auto-hide.ts` | Alt-to-show fallback for the auto-hidden native menu bar |
| `electron/main.ts` | Calls `setupApplicationMenu()` and `configureAutoHideMenuBar()` in `createMainWindow()` |
| `electron/window-config.ts` | Contains `autoHideMenuBar: true` — the menu bar appears on Alt press |

## Menu Structure

```typescript
{
  label: 'File',
  submenu: [{ role: 'close' }]
},
{
  label: 'Edit',
  submenu: [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'selectAll' },
  ]
},
{
  label: 'View',
  submenu: [
    { label: 'Back', accelerator: 'Alt+Left', click: ... },
    { label: 'Forward', accelerator: 'Alt+Right', click: ... },
    { type: 'separator' },
    { role: 'toggleDevTools' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  ]
},
{ role: 'help' }
```

## Zoom Separation

| Zoom Type | Mechanism | Location | Scope |
|-----------|-----------|----------|-------|
| Electron native (removed) | BrowserWindow zoom | Menu bar (View → Zoom) | Entire window |
| Trama custom | CSS `zoom` on `.ql-container` | Toolbar dropdown + Ctrl++/Ctrl- | Editor content only |

Trama's zoom is documented in `docs/architecture/editor-zoom-architecture.md`.

## Invariant

The context menu (right-click) is **not** affected by `Menu.setApplicationMenu()`. It is set up separately in `electron/main-process/context-menu.ts` and remains fully functional.

## Related Documents

- `docs/architecture/editor-zoom-architecture.md` — Trama's custom zoom implementation
- `docs/architecture/rich-editor-hotspots.md` — Editor command bridge via context menu
- `docs/live/file-map.md` — File ownership
