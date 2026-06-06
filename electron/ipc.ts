import type { BrowserWindow, IpcMain } from 'electron'
import {
  debugLogRequestSchema,
  IPC_CHANNELS,
  type DebugLogRequest,
  setFullscreenRequestSchema,
} from '../src/shared/ipc.js'
import {
  buildPingResponse,
  configureMainWindowResolver,
  shutdownIpcServices,
} from './ipc/handlers/index.js'
import { registerSpellcheckHandler } from './ipc/spellcheck.js'
import { registerMenuBarHandlers } from './ipc/menu-bar-handlers.js'
import { registerWindowAppearanceHandler } from './ipc/window-appearance.js'
import {
  registerProjectHandlers,
  registerDocumentHandlers,
  registerFolderHandlers,
  registerAiHandlers,
  registerGitHistoryHandlers,
  registerTagHandlers,
  registerZuluHandlers,
  registerHelpHandlers,
} from './ipc-features.js'

let mainWindowHasUnsavedChanges = false

export function getMainWindowHasUnsavedChanges(): boolean {
  return mainWindowHasUnsavedChanges
}

export { buildPingResponse, shutdownIpcServices }

function registerFullscreenHandler(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.setFullscreen, (_event, payload: unknown) => {
    const parsed = setFullscreenRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid fullscreen payload',
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

    win.setFullScreen(parsed.data.enabled)
    return {
      ok: true,
      data: {
        enabled: win.isFullScreen(),
      },
    }
  })
}

function registerDebugHandler(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.debugLog, (_event, payload: DebugLogRequest) => {
    const parsed = debugLogRequestSchema.safeParse(payload)
    if (!parsed.success) return
    const { source, message, details } = parsed.data
    if (details === undefined) {
      console.log(`[renderer:${source}] ${message}`)
    } else {
      console.log(`[renderer:${source}] ${message}`, details)
    }
  })
}

function registerPingHandler(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.ping, (_event, payload) => buildPingResponse(payload))
}

function registerCoreHandlers(ipcMain: IpcMain): void {
  registerDebugHandler(ipcMain)
  registerPingHandler(ipcMain)
  registerProjectHandlers(ipcMain)
  registerDocumentHandlers(ipcMain)
  registerFolderHandlers(ipcMain)
}

export function registerIpcHandlers(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null): void {
  configureMainWindowResolver(getMainWindow)
  registerCoreHandlers(ipcMain)
  registerFullscreenHandler(ipcMain, getMainWindow)
  registerMenuBarHandlers(ipcMain, getMainWindow)
  registerWindowAppearanceHandler(ipcMain, getMainWindow)
  registerSpellcheckHandler(ipcMain, getMainWindow)
  registerAiHandlers(ipcMain)
  registerGitHistoryHandlers(ipcMain)
  registerTagHandlers(ipcMain)
  registerZuluHandlers(ipcMain)
  registerHelpHandlers(ipcMain, getMainWindow)

  ipcMain.handle(IPC_CHANNELS.notifyCloseState, (_event, payload: unknown) => {
    if (typeof payload === 'object' && payload !== null && 'hasUnsavedChanges' in payload) {
      mainWindowHasUnsavedChanges = Boolean((payload as Record<string, unknown>).hasUnsavedChanges)
    }
  })
}
