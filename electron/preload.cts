import { contextBridge, ipcRenderer } from 'electron'
import {
  debugLogRequestSchema,
  IPC_CHANNELS,
  type DebugLogRequest,
  type ExternalFileEvent,
  type IpcEnvelope,
  type OpenProjectRequest,
  type PingRequest,
  type PingResponse,
  type ProjectIndex,
  type ProjectSnapshot,
  type ReadDocumentRequest,
  type ReadDocumentResponse,
  type SaveDocumentRequest,
  type SaveDocumentResponse,
  type SelectProjectFolderResponse,
} from '../src/shared/ipc'

const tramaApi = {
  ping(payload: PingRequest): Promise<IpcEnvelope<PingResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.ping, payload)
  },
  debugLog(payload: DebugLogRequest): Promise<void> {
    const parsed = debugLogRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return Promise.resolve()
    }

    return ipcRenderer.invoke(IPC_CHANNELS.debugLog, parsed.data)
  },
  openProject(payload: OpenProjectRequest): Promise<IpcEnvelope<ProjectSnapshot>> {
    return ipcRenderer.invoke(IPC_CHANNELS.openProject, payload)
  },
  selectProjectFolder(): Promise<IpcEnvelope<SelectProjectFolderResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.selectProjectFolder)
  },
  readDocument(payload: ReadDocumentRequest): Promise<IpcEnvelope<ReadDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.readDocument, payload)
  },
  saveDocument(payload: SaveDocumentRequest): Promise<IpcEnvelope<SaveDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.saveDocument, payload)
  },
  getIndex(): Promise<IpcEnvelope<ProjectIndex>> {
    return ipcRenderer.invoke(IPC_CHANNELS.getIndex)
  },
  onExternalFileEvent(callback: (event: ExternalFileEvent) => void): () => void {
    const listener = (_event: unknown, payload: ExternalFileEvent) => {
      callback(payload)
    }

    ipcRenderer.on(IPC_CHANNELS.externalFileEvent, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.externalFileEvent, listener)
    }
  },
}

contextBridge.exposeInMainWorld('tramaApi', tramaApi)
