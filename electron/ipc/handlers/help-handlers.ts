import {
  openHelpRequestSchema,
  setGettingStartedDismissedRequestSchema,
  type GetGettingStartedDismissedResponse,
  type IpcEnvelope,
  type OpenHelpResponse,
  type SetGettingStartedDismissedResponse,
} from '../../../src/shared/ipc.js'
import { openHelpPage } from '../../main-process/help-window.js'
import { GETTING_STARTED_DISMISSED_STORAGE_KEY } from '../../../src/shared/help-storage-key.js'
import type { BrowserWindow } from 'electron'

const GETTING_STARTED_READ_EXPRESSION = `localStorage.getItem(${JSON.stringify(GETTING_STARTED_DISMISSED_STORAGE_KEY)})`
const GETTING_STARTED_SET_EXPRESSION = (value: 'true' | null): string => {
  if (value === null) {
    return `localStorage.removeItem(${JSON.stringify(GETTING_STARTED_DISMISSED_STORAGE_KEY)})`
  }
  return `localStorage.setItem(${JSON.stringify(GETTING_STARTED_DISMISSED_STORAGE_KEY)}, ${JSON.stringify(value)})`
}

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

export async function handleGetGettingStartedDismissed(
  getMainWindow: () => BrowserWindow | null,
): Promise<IpcEnvelope<GetGettingStartedDismissedResponse>> {
  const mainWin = getMainWindow()
  if (!mainWin || mainWin.isDestroyed()) {
    return {
      ok: true,
      data: { dismissed: false },
    }
  }
  try {
    const raw = await mainWin.webContents.executeJavaScript(GETTING_STARTED_READ_EXPRESSION)
    return {
      ok: true,
      data: { dismissed: raw === 'true' },
    }
  } catch (err) {
    console.error('Failed to read getting-started dismissal in main window local storage:', err)
    return {
      ok: false,
      error: {
        code: 'STORAGE_READ_FAILED',
        message: 'Failed to read dismissal key from main window',
      },
    }
  }
}

export async function handleSetGettingStartedDismissed(
  getMainWindow: () => BrowserWindow | null,
  rawPayload: unknown,
): Promise<IpcEnvelope<SetGettingStartedDismissedResponse>> {
  const payload = setGettingStartedDismissedRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload for trama:help:set-getting-started-dismissed',
        details: payload.error.flatten(),
      },
    }
  }

  const mainWin = getMainWindow()
  if (!mainWin || mainWin.isDestroyed()) {
    return {
      ok: false,
      error: {
        code: 'MAIN_WINDOW_UNAVAILABLE',
        message: 'Main window is not available to persist dismissal state',
      },
    }
  }

  try {
    const expression = GETTING_STARTED_SET_EXPRESSION(payload.data.dismissed ? 'true' : null)
    await mainWin.webContents.executeJavaScript(expression)
  } catch (err) {
    console.error('Failed to persist getting-started dismissal in main window local storage:', err)
    return {
      ok: false,
      error: {
        code: 'STORAGE_WRITE_FAILED',
        message: 'Failed to write dismissal key to main window',
      },
    }
  }

  return {
    ok: true,
    data: { success: true },
  }
}
