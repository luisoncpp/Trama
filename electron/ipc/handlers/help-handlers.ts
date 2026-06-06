import { openHelpRequestSchema, type IpcEnvelope, type OpenHelpResponse } from '../../../src/shared/ipc.js'
import { openHelpPage } from '../../main-process/help-window.js'
import type { BrowserWindow } from 'electron'

export async function handleOpenHelp(
  getMainWindow: () => BrowserWindow | null,
  rawPayload: unknown,
): Promise<IpcEnvelope<OpenHelpResponse>> {
  const payload = openHelpRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload for trama:help:open',
        details: payload.error.flatten(),
      },
    }
  }

  const mainWin = getMainWindow()
  let resolvedTheme: 'light' | 'dark' = 'dark'
  if (mainWin && !mainWin.isDestroyed()) {
    try {
      const theme = await mainWin.webContents.executeJavaScript(
        "document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'",
      )
      if (theme === 'light' || theme === 'dark') {
        resolvedTheme = theme
      }
    } catch (err) {
      console.error('Failed to resolve theme from main window, falling back to dark:', err)
    }
  }

  openHelpPage(mainWin, { page: payload.data.page, resolvedTheme })

  return {
    ok: true,
    data: { success: true },
  }
}

export async function handleDismissGettingStarted(
  getMainWindow: () => BrowserWindow | null,
): Promise<IpcEnvelope<{ success: boolean }>> {
  const mainWin = getMainWindow()
  if (mainWin && !mainWin.isDestroyed()) {
    try {
      await mainWin.webContents.executeJavaScript(
        "localStorage.setItem('trama.help.getting-started.dismissed.v1', 'true')",
      )
    } catch (err) {
      console.error('Failed to dismiss getting started in main window local storage:', err)
      return {
        ok: false,
        error: {
          code: 'STORAGE_WRITE_FAILED',
          message: 'Failed to write dismissal key to main window',
        },
      }
    }
  }
  return {
    ok: true,
    data: { success: true },
  }
}
