import type { BrowserWindow, IpcMain } from 'electron'
import { IPC_CHANNELS, setWindowAppearanceRequestSchema } from '../../src/shared/ipc.js'
import { applyWindowChrome } from '../window-chrome.js'

export function registerWindowAppearanceHandler(
  ipcMain: IpcMain,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle(IPC_CHANNELS.setWindowAppearance, (_event, payload: unknown) => {
    const parsed = setWindowAppearanceRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid window appearance payload',
          details: parsed.error.flatten(),
        },
      }
    }

    const win = getMainWindow()
    if (!win || win.isDestroyed()) {
      return {
        ok: false,
        error: {
          code: 'WINDOW_UNAVAILABLE',
          message: 'Main window is not available',
        },
      }
    }

    applyWindowChrome(win, parsed.data.theme)
    return {
      ok: true,
      data: {
        theme: parsed.data.theme,
      },
    }
  })
}
