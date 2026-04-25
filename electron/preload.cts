import { contextBridge, ipcRenderer } from 'electron'
import {
  debugLogRequestSchema,
  IPC_CHANNELS,
  type AiExportRequest,
  type AiExportResponse,
  type BookExportRequest,
  type BookExportResponse,
  type AiImportPreview,
  type AiImportRequest,
  type AiImportResponse,
  type CreateDocumentRequest,
  type CreateDocumentResponse,
  type CreateFolderRequest,
  type CreateFolderResponse,
  type DeleteFolderRequest,
  type DeleteFolderResponse,
  type DeleteDocumentRequest,
  type DeleteDocumentResponse,
  type DebugLogRequest,
  type ExternalFileEvent,
  type FullscreenChangedEvent,
  type IpcEnvelope,
  type OpenProjectRequest,
  type PingRequest,
  type PingResponse,
  type ProjectIndex,
  type ProjectSnapshot,
  type ReadDocumentRequest,
  type ReadDocumentResponse,
  type RenameDocumentRequest,
  type RenameDocumentResponse,
  type RenameFolderRequest,
  type RenameFolderResponse,
  type SaveDocumentRequest,
  type SaveDocumentResponse,
  type ReorderFilesRequest,
  type ReorderFilesResponse,
  type MoveFileRequest,
  type MoveFileResponse,
  type MoveFolderRequest,
  type MoveFolderResponse,
  type NotifyCloseState,
  type SelectProjectFolderResponse,
  type SetSpellcheckSettingsRequest,
  type SetFullscreenRequest,
  type SetFullscreenResponse,
  type SpellcheckSettingsResponse,
  type ZuluImportPreviewRequest,
  type ZuluImportPreviewResponse,
  type ZuluImportRequest,
  type ZuluImportResponse,
  type ZuluSelectFileResponse,
} from '../src/shared/ipc'
import { type TagGetIndexResponse, type TagResolveRequest, type TagResolveResponse, tagGetIndexResponseSchema, tagResolveRequestSchema } from '../src/shared/ipc-tag'

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
  createDocument(payload: CreateDocumentRequest): Promise<IpcEnvelope<CreateDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.createDocument, payload)
  },
  createFolder(payload: CreateFolderRequest): Promise<IpcEnvelope<CreateFolderResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.createFolder, payload)
  },
  renameFolder(payload: RenameFolderRequest): Promise<IpcEnvelope<RenameFolderResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.renameFolder, payload)
  },
  deleteFolder(payload: DeleteFolderRequest): Promise<IpcEnvelope<DeleteFolderResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.deleteFolder, payload)
  },
  renameDocument(payload: RenameDocumentRequest): Promise<IpcEnvelope<RenameDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.renameDocument, payload)
  },
  deleteDocument(payload: DeleteDocumentRequest): Promise<IpcEnvelope<DeleteDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.deleteDocument, payload)
  },
  getIndex(): Promise<IpcEnvelope<ProjectIndex>> {
    return ipcRenderer.invoke(IPC_CHANNELS.getIndex)
  },
  setFullscreen(payload: SetFullscreenRequest): Promise<IpcEnvelope<SetFullscreenResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.setFullscreen, payload)
  },
  getSpellcheckSettings(): Promise<IpcEnvelope<SpellcheckSettingsResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.getSpellcheckSettings)
  },
  setSpellcheckSettings(payload: SetSpellcheckSettingsRequest): Promise<IpcEnvelope<SpellcheckSettingsResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.setSpellcheckSettings, payload)
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
  onFullscreenChanged(callback: (event: FullscreenChangedEvent) => void): () => void {
    const listener = (_event: unknown, payload: FullscreenChangedEvent) => {
      callback(payload)
    }

    ipcRenderer.on(IPC_CHANNELS.fullscreenChanged, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.fullscreenChanged, listener)
    }
  },
  aiImportPreview(payload: AiImportRequest): Promise<IpcEnvelope<AiImportPreview>> {
    return ipcRenderer.invoke(IPC_CHANNELS.aiImportPreview, payload)
  },
  aiImport(payload: AiImportRequest): Promise<IpcEnvelope<AiImportResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.aiImport, payload)
  },
  aiExport(payload: AiExportRequest): Promise<IpcEnvelope<AiExportResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.aiExport, payload)
  },
  bookExport(payload: BookExportRequest): Promise<IpcEnvelope<BookExportResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.bookExport, payload)
  },
  getTagIndex(): Promise<IpcEnvelope<TagGetIndexResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.tagGetIndex)
  },
  resolveTag(payload: TagResolveRequest): Promise<IpcEnvelope<TagResolveResponse>> {
    const parsed = tagResolveRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return Promise.resolve({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payload for tag resolve',
          details: parsed.error.flatten(),
        },
      })
    }
    return ipcRenderer.invoke(IPC_CHANNELS.tagResolve, parsed.data)
  },
  reorderFiles(payload: ReorderFilesRequest): Promise<IpcEnvelope<ReorderFilesResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.reorderFiles, payload)
  },
  moveFile(payload: MoveFileRequest): Promise<IpcEnvelope<MoveFileResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.moveFile, payload)
  },
  moveFolder(payload: MoveFolderRequest): Promise<IpcEnvelope<MoveFolderResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.moveFolder, payload)
  },
  notifyCloseState(payload: NotifyCloseState): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.notifyCloseState, payload)
  },
  zuluSelectFile(): Promise<IpcEnvelope<ZuluSelectFileResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.zuluSelectFile)
  },
  zuluImportPreview(payload: ZuluImportPreviewRequest): Promise<IpcEnvelope<ZuluImportPreviewResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.zuluImportPreview, payload)
  },
  zuluImport(payload: ZuluImportRequest): Promise<IpcEnvelope<ZuluImportResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.zuluImport, payload)
  },
}

contextBridge.exposeInMainWorld('tramaApi', tramaApi)
