import type { BrowserWindow, IpcMain } from 'electron'
import {
  type CreateDocumentRequest,
  type CreateFolderRequest,
  type DeleteDocumentRequest,
  debugLogRequestSchema,
  IPC_CHANNELS,
  type DebugLogRequest,
  type OpenProjectRequest,
  type PingRequest,
  type ReadDocumentRequest,
  type RenameDocumentRequest,
  type SaveDocumentRequest,
} from '../src/shared/ipc.js'
import {
  buildPingResponse,
  configureMainWindowResolver,
  handleCreateDocument,
  handleCreateFolder,
  handleDeleteDocument,
  handleGetIndex,
  handleOpenProject,
  handleReadDocument,
  handleRenameDocument,
  handleSaveDocument,
  handleSelectProjectFolder,
  shutdownIpcServices,
} from './ipc/handlers/index.js'

export { buildPingResponse, shutdownIpcServices }

export function registerIpcHandlers(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null): void {
  configureMainWindowResolver(getMainWindow)

  ipcMain.handle(IPC_CHANNELS.debugLog, (_event, payload: DebugLogRequest) => {
    const parsed = debugLogRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return
    }

    const { source, message, details } = parsed.data
    if (details === undefined) {
      console.log(`[renderer:${source}] ${message}`)
      return
    }

    console.log(`[renderer:${source}] ${message}`, details)
  })

  ipcMain.handle(IPC_CHANNELS.ping, (_event, payload: PingRequest) => {
    return buildPingResponse(payload)
  })

  ipcMain.handle(IPC_CHANNELS.openProject, (_event, payload: OpenProjectRequest) => {
    return handleOpenProject(payload)
  })

  ipcMain.handle(IPC_CHANNELS.selectProjectFolder, () => {
    return handleSelectProjectFolder()
  })

  ipcMain.handle(IPC_CHANNELS.readDocument, (_event, payload: ReadDocumentRequest) => {
    return handleReadDocument(payload)
  })

  ipcMain.handle(IPC_CHANNELS.saveDocument, (_event, payload: SaveDocumentRequest) => {
    return handleSaveDocument(payload)
  })

  ipcMain.handle(IPC_CHANNELS.createDocument, (_event, payload: CreateDocumentRequest) => {
    return handleCreateDocument(payload)
  })

  ipcMain.handle(IPC_CHANNELS.createFolder, (_event, payload: CreateFolderRequest) => {
    return handleCreateFolder(payload)
  })

  ipcMain.handle(IPC_CHANNELS.renameDocument, (_event, payload: RenameDocumentRequest) => {
    return handleRenameDocument(payload)
  })

  ipcMain.handle(IPC_CHANNELS.deleteDocument, (_event, payload: DeleteDocumentRequest) => {
    return handleDeleteDocument(payload)
  })

  ipcMain.handle(IPC_CHANNELS.getIndex, () => {
    return handleGetIndex()
  })
}
