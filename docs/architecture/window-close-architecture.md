# Window Close Behavior — Architecture

Date: 2026-04-23

## Context

When the user closes the window (via X button, Alt+F4, or any other mechanism), Trama must check for unsaved changes in open editor panes and prompt accordingly.

## Problem

Electron's `BrowserWindow` `close` event fires for all close mechanisms (X button, Alt+F4, `win.close()`, etc.). However, the initial implementation tried to query the renderer's dirty state asynchronously via `webContents.executeJavaScript()` from within the `close` handler. This was unreliable because:

- `event.preventDefault()` in an async `close` handler does not reliably block the close on all platforms.
- Promise chains that continued after a "Cancel" dialog choice would incorrectly close the window anyway.

## Solution

The close behavior is split across two layers:

### Main process (`electron/main-process/window-close.ts`)

`configureWindowCloseBehavior(win)` registers a synchronous `close` handler that:

1. Always calls `event.preventDefault()` to block the close.
2. Reads cached dirty state synchronously from `mainWindowHasUnsavedChanges` (a module-level variable in `electron/ipc.ts`).
3. If no unsaved changes → sets `forceClose = true` and calls `win.destroy()`.
4. If unsaved → shows native dialog: *Guardar y cerrar* / *Cerrar sin guardar* / *Cancelar*.
   - *Guardar y cerrar*: calls `__tramaSaveAll()` via `webContents.executeJavaScript()`, then `win.destroy()`.
   - *Cerrar sin guardar*: calls `win.destroy()` directly.
   - *Cancelar*: rejects with `CANCELLED` error; `.catch()` recognizes it and does nothing (window stays open).

### Renderer process (`src/features/project-editor/use-project-editor-close-effect.ts`)

The `useProjectEditorCloseEffect` hook:

1. **Notifies dirty state to main**: calls `window.tramaApi.notifyCloseState({ hasUnsavedChanges })` whenever `primaryPane.isDirty` or `secondaryPane.isDirty` changes.
2. **Exposes `__tramaSaveAll`**: sets `window.__tramaSaveAll` to a function that saves all dirty panes in parallel via `saveDocumentNow`.
3. Both are cleaned up when the component unmounts or dependencies change.

### IPC bridge (`electron/ipc.ts`)

A module-level variable `mainWindowHasUnsavedChanges` caches the dirty state. The `notifyCloseState` IPC handler updates it:

```ts
ipcMain.handle(IPC_CHANNELS.notifyCloseState, (_event, payload) => {
  if (typeof payload === 'object' && payload !== null && 'hasUnsavedChanges' in payload) {
    mainWindowHasUnsavedChanges = Boolean(payload.hasUnsavedChanges)
  }
})
```

### Preload (`electron/preload.cts`)

Exposes `notifyCloseState` on `window.tramaApi`:

```ts
notifyCloseState(payload: NotifyCloseState): Promise<void> {
  return ipcRenderer.invoke(IPC_CHANNELS.notifyCloseState, payload)
}
```

## Key Files

| File | Role |
|------|------|
| `electron/main-process/window-close.ts` | Close event handler in main process |
| `electron/ipc.ts` | Caches `hasUnsavedChanges` state; registers `notifyCloseState` handler |
| `electron/preload.cts` | Exposes `notifyCloseState` to renderer |
| `src/features/project-editor/use-project-editor-close-effect.ts` | Renderer side: notifies dirty state, exposes `__tramaSaveAll` |
| `src/features/project-editor/use-project-editor.ts` | Wires the close effect hook |

## Important Invariant

`mainWindowHasUnsavedChanges` is always written by the renderer (via IPC) and read synchronously by the main process close handler. The renderer's effect fires on every dirty state change, so the cache is always fresh by the time the user initiates a close.

## Testing

See `tests/window-close.test.ts` for regression tests covering:
- Dirty state notification on pane change
- `__tramaSaveAll` saves all dirty panes
- Save on switch clears dirty flag

## Related Lessons

- **Promise chain cancel bug**: A `.then().then().catch()` chain does not short-circuit when a step returns `undefined`. To cancel and leave the window open, the cancel step must `return Promise.reject(new Error('CANCELLED'))` so the `.catch()` can distinguish it from other errors.
- **Alt+F4 vs `close` event**: On some Windows/Electron configurations, Alt+F4 bypasses the `close` event. This was initially suspected but ultimately the issue was the Function Lock key. The synchronous `close` handler approach works for all close mechanisms once Function Lock is disabled.
