import type { BrowserWindow, IpcMain } from 'electron'

let mainWindowHasUnsavedChanges = false

export function getMainWindowHasUnsavedChanges(): boolean {
  return mainWindowHasUnsavedChanges
}
import {
  type CreateDocumentRequest,
  type CreateFolderRequest,
  type DeleteFolderRequest,
  type DeleteDocumentRequest,
  debugLogRequestSchema,
  IPC_CHANNELS,
  type DebugLogRequest,
  type OpenProjectRequest,
  type PingRequest,
  type ReadDocumentRequest,
  type RenameDocumentRequest,
  type RenameFolderRequest,
  type SaveDocumentRequest,
  setFullscreenRequestSchema,
  type AiImportRequest,
  type AiExportRequest,
  type BookExportRequest,
} from '../src/shared/ipc.js'
import {
  buildPingResponse,
  configureMainWindowResolver,
  handleCreateDocument,
  handleCreateFolder,
  handleDeleteFolder,
  handleDeleteDocument,
  handleMoveFolder,
  handleGetIndex,
  handleOpenProject,
  handleReadDocument,
  handleRenameDocument,
  handleRenameFolder,
  handleSaveDocument,
  handleSelectProjectFolder,
  shutdownIpcServices,
  handleAiImportPreview,
  handleAiImport,
  handleAiExport,
  handleBookExport,
  handleTagGetIndex,
  handleTagResolve,
  handleReorderFiles,
  handleMoveFile,
} from './ipc/handlers/index.js'
import { registerSpellcheckHandler } from './ipc/spellcheck.js'

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

function registerProjectHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.openProject, (_event, payload) => handleOpenProject(payload))
  ipcMain.handle(IPC_CHANNELS.selectProjectFolder, () => handleSelectProjectFolder())
  ipcMain.handle(IPC_CHANNELS.getIndex, () => handleGetIndex())
  ipcMain.handle(IPC_CHANNELS.reorderFiles, (_event, payload) => handleReorderFiles(payload))
  ipcMain.handle(IPC_CHANNELS.moveFile, (_event, payload) => handleMoveFile(payload))
}

function registerDocumentHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.readDocument, (_event, payload) => handleReadDocument(payload))
  ipcMain.handle(IPC_CHANNELS.saveDocument, (_event, payload) => handleSaveDocument(payload))
  ipcMain.handle(IPC_CHANNELS.createDocument, (_event, payload) => handleCreateDocument(payload))
  ipcMain.handle(IPC_CHANNELS.renameDocument, (_event, payload) => handleRenameDocument(payload))
  ipcMain.handle(IPC_CHANNELS.deleteDocument, (_event, payload) => handleDeleteDocument(payload))
}

function registerFolderHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.createFolder, (_event, payload) => handleCreateFolder(payload))
  ipcMain.handle(IPC_CHANNELS.renameFolder, (_event, payload) => handleRenameFolder(payload))
  ipcMain.handle(IPC_CHANNELS.deleteFolder, (_event, payload) => handleDeleteFolder(payload))
  ipcMain.handle(IPC_CHANNELS.moveFolder, (_event, payload) => handleMoveFolder(payload))
}

function registerCoreHandlers(ipcMain: IpcMain): void {
  registerDebugHandler(ipcMain)
  registerPingHandler(ipcMain)
  registerProjectHandlers(ipcMain)
  registerDocumentHandlers(ipcMain)
  registerFolderHandlers(ipcMain)
}

function registerAiHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.aiImport, (_event, payload: AiImportRequest) => {
    return handleAiImport(_event, payload)
  })

  ipcMain.handle(IPC_CHANNELS.aiImportPreview, (_event, payload: AiImportRequest) => {
    return handleAiImportPreview(_event, payload)
  })

  ipcMain.handle(IPC_CHANNELS.aiExport, (_event, payload: AiExportRequest) => {
    return handleAiExport(_event, payload)
  })

  ipcMain.handle(IPC_CHANNELS.bookExport, (_event, payload: BookExportRequest) => {
    return handleBookExport(_event, payload)
  })
}

function registerTagHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.tagGetIndex, () => handleTagGetIndex())
  ipcMain.handle(IPC_CHANNELS.tagResolve, (_event, payload) => handleTagResolve(payload))
}

export function registerIpcHandlers(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null): void {
  configureMainWindowResolver(getMainWindow)
  registerCoreHandlers(ipcMain)
  registerFullscreenHandler(ipcMain, getMainWindow)
  registerSpellcheckHandler(ipcMain, getMainWindow)
  registerAiHandlers(ipcMain)
  registerTagHandlers(ipcMain)

  ipcMain.handle(IPC_CHANNELS.notifyCloseState, (_event, payload: unknown) => {
    if (typeof payload === 'object' && payload !== null && 'hasUnsavedChanges' in payload) {
      mainWindowHasUnsavedChanges = Boolean((payload as Record<string, unknown>).hasUnsavedChanges)
    }
  })
}
