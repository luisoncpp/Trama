import type { BrowserWindow, IpcMain } from 'electron'
import {
  IPC_CHANNELS,
  type OpenProjectRequest,
  type PingRequest,
  type ReadDocumentRequest,
  type SaveDocumentRequest,
} from '../src/shared/ipc.js'
import {
  buildPingResponse,
  configureMainWindowResolver,
  handleGetIndex,
  handleOpenProject,
  handleReadDocument,
  handleSaveDocument,
  handleSelectProjectFolder,
  shutdownIpcServices,
} from './ipc/handlers/index.js'

export { buildPingResponse, shutdownIpcServices }

export function registerIpcHandlers(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null): void {
  configureMainWindowResolver(getMainWindow)

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

  ipcMain.handle(IPC_CHANNELS.getIndex, () => {
    return handleGetIndex()
  })
}
