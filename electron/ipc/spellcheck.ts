import type { BrowserWindow, IpcMain } from 'electron'
import { IPC_CHANNELS, setSpellcheckSettingsRequestSchema } from '../../src/shared/ipc.js'

function readSpellcheckSettings(win: BrowserWindow, enabledOverride?: boolean) {
  const session = win.webContents.session
  const selectedLanguages = session.getSpellCheckerLanguages()

  return {
    enabled: enabledOverride ?? session.isSpellCheckerEnabled(),
    selectedLanguage: selectedLanguages[0] ?? null,
    availableLanguages: session.availableSpellCheckerLanguages,
    supportsLanguageSelection: process.platform !== 'darwin',
  }
}

function buildWindowUnavailableError() {
  return {
    ok: false as const,
    error: {
      code: 'WINDOW_UNAVAILABLE',
      message: 'Main window is not available',
    },
  }
}

function buildValidationError(details: unknown) {
  return {
    ok: false as const,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid spellcheck settings payload',
      details,
    },
  }
}

function applySpellcheckLanguage(win: BrowserWindow, language: string | null | undefined) {
  const session = win.webContents.session
  if (process.platform === 'darwin' || !language) {
    return null
  }

  if (!session.availableSpellCheckerLanguages.includes(language)) {
    return {
      ok: false as const,
      error: {
        code: 'UNSUPPORTED_LANGUAGE',
        message: `Spellcheck language not supported: ${language}`,
      },
    }
  }

  session.setSpellCheckerLanguages([language])
  return null
}

export function registerSpellcheckHandler(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.getSpellcheckSettings, () => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) {
      return buildWindowUnavailableError()
    }

    return { ok: true, data: readSpellcheckSettings(win) }
  })

  ipcMain.handle(IPC_CHANNELS.setSpellcheckSettings, (_event, payload: unknown) => {
    const parsed = setSpellcheckSettingsRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return buildValidationError(parsed.error.flatten())
    }

    const win = getMainWindow()
    if (!win || win.isDestroyed()) {
      return buildWindowUnavailableError()
    }

    win.webContents.session.setSpellCheckerEnabled(parsed.data.enabled)
    const languageError = applySpellcheckLanguage(win, parsed.data.language)
    if (languageError) {
      return languageError
    }

    return { ok: true, data: readSpellcheckSettings(win, parsed.data.enabled) }
  })
}