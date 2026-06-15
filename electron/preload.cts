/* eslint-disable max-lines */
import { contextBridge, ipcRenderer } from 'electron'
import {
  debugLogRequestSchema,
  IPC_CHANNELS,
  type AiExportRequest,
  type AiExportResponse,
  type AiExportPickStagingRequest,
  type AiExportPickStagingResponse,
  type BookExportRequest,
  type BookExportResponse,
  type AiImportPreview,
  type AiImportRequest,
  type AiImportResponse,
  type CreateDocumentRequest,
  type CreateDocumentResponse,
  type CreateFromTemplateRequest,
  type CreateFromTemplateResponse,
  type GetTemplatesResponse,
  type CreateMapDocumentRequest,
  type CreateMapDocumentResponse,
  type SelectMapImageResponse,
  type CreateRelationshipsDocumentRequest,
  type CreateRelationshipsDocumentResponse,
  type CreateFolderRequest,
  type CreateFolderResponse,
  type DeleteFolderRequest,
  type DeleteFolderResponse,
  type DeleteDocumentRequest,
  type DeleteDocumentResponse,
  type DebugLogRequest,
  type ExternalFileEvent,
  type FullscreenChangedEvent,
  type GitHistoryStatusResponse,
  type IpcEnvelope,
  type ListDocumentRevisionsRequest,
  type ListDocumentRevisionsResponse,
  type LoadDocumentRevisionRequest,
  type LoadDocumentRevisionResponse,
  type CloseProjectResponse,
  type OpenProjectRequest,
  type RevealInFileManagerRequest,
  type RevealInFileManagerResponse,
  type PingRequest,
  type PingResponse,
  type ProjectIndex,
  type ProjectSnapshot,
  type ReadDocumentRequest,
  type ReadDocumentResponse,
  type ReadImageFileRequest,
  type ReadImageFileResponse,
  type ReadDocumentRevisionRequest,
  type ReadDocumentRevisionResponse,
  type RenameDocumentRequest,
  type RenameDocumentResponse,
  type RenameFolderRequest,
  type RenameFolderResponse,
  type SaveDocumentRequest,
  type SaveDocumentResponse,
  type SaveGitSnapshotRequest,
  type SaveGitSnapshotResponse,
  type ReorderFilesRequest,
  type ReorderFilesResponse,
  type MoveFileRequest,
  type MoveFileResponse,
  type MoveFolderRequest,
  type MoveFolderResponse,
  type NotifyCloseState,
  type SelectProjectFolderResponse,
  type ValidateProjectFolderRequest,
  type ValidateProjectFolderResponse,
  type SetSpellcheckSettingsRequest,
  type SetFullscreenRequest,
  type SetFullscreenResponse,
  type SetWindowAppearanceRequest,
  type SetWindowAppearanceResponse,
  type SpellcheckSettingsResponse,
  type ZuluImportPreviewRequest,
  type ZuluImportPreviewResponse,
  type ZuluImportRequest,
  type ZuluImportResponse,
  type ZuluSelectFileResponse,
  type OpenHelpRequest,
  type OpenHelpResponse,
} from '../src/shared/ipc'
import { type TagGetIndexResponse, type TagResolveRequest, type TagResolveResponse, tagResolveRequestSchema } from '../src/shared/ipc-tag'

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
  closeProject(): Promise<IpcEnvelope<CloseProjectResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.closeProject)
  },
  revealInFileManager(
    payload: RevealInFileManagerRequest,
  ): Promise<IpcEnvelope<RevealInFileManagerResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.revealInFileManager, payload)
  },
  selectProjectFolder(): Promise<IpcEnvelope<SelectProjectFolderResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.selectProjectFolder)
  },
  validateProjectFolder(payload: ValidateProjectFolderRequest): Promise<IpcEnvelope<ValidateProjectFolderResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.validateProjectFolder, payload)
  },
  readDocument(payload: ReadDocumentRequest): Promise<IpcEnvelope<ReadDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.readDocument, payload)
  },
  readImageFile(payload: ReadImageFileRequest): Promise<IpcEnvelope<ReadImageFileResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.readImageFile, payload)
  },
  saveDocument(payload: SaveDocumentRequest): Promise<IpcEnvelope<SaveDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.saveDocument, payload)
  },
  createDocument(payload: CreateDocumentRequest): Promise<IpcEnvelope<CreateDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.createDocument, payload)
  },
  createFromTemplate(payload: CreateFromTemplateRequest): Promise<IpcEnvelope<CreateFromTemplateResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.createFromTemplate, payload)
  },
  getTemplates(): Promise<IpcEnvelope<GetTemplatesResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.getTemplates)
  },
  createMapDocument(payload: CreateMapDocumentRequest): Promise<IpcEnvelope<CreateMapDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.createMapDocument, payload)
  },
  selectMapImage(): Promise<IpcEnvelope<SelectMapImageResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.selectMapImage)
  },
  createRelationshipsDocument(payload: CreateRelationshipsDocumentRequest): Promise<IpcEnvelope<CreateRelationshipsDocumentResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.createRelationshipsDocument, payload)
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
  revealMenuBar(): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.revealMenuBar)
  },
  hideMenuBar(): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.hideMenuBar)
  },
  setWindowAppearance(payload: SetWindowAppearanceRequest): Promise<IpcEnvelope<SetWindowAppearanceResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.setWindowAppearance, payload)
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
  onReloadProjectRequested(callback: () => void): () => void {
    const listener = () => {
      callback()
    }

    ipcRenderer.on(IPC_CHANNELS.reloadProjectRequested, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.reloadProjectRequested, listener)
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
  aiExportPickStaging(payload: AiExportPickStagingRequest): Promise<IpcEnvelope<AiExportPickStagingResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.aiExportPickStaging, payload)
  },
  bookExport(payload: BookExportRequest): Promise<IpcEnvelope<BookExportResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.bookExport, payload)
  },
  gitHistoryStatus(): Promise<IpcEnvelope<GitHistoryStatusResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.gitHistoryStatus)
  },
  saveGitSnapshot(payload: SaveGitSnapshotRequest): Promise<IpcEnvelope<SaveGitSnapshotResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.saveGitSnapshot, payload)
  },
  listDocumentRevisions(payload: ListDocumentRevisionsRequest): Promise<IpcEnvelope<ListDocumentRevisionsResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.listDocumentRevisions, payload)
  },
  readDocumentRevision(payload: ReadDocumentRevisionRequest): Promise<IpcEnvelope<ReadDocumentRevisionResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.readDocumentRevision, payload)
  },
  loadDocumentRevision(payload: LoadDocumentRevisionRequest): Promise<IpcEnvelope<LoadDocumentRevisionResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.loadDocumentRevision, payload)
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
  openHelp(payload: OpenHelpRequest): Promise<IpcEnvelope<OpenHelpResponse>> {
    return ipcRenderer.invoke(IPC_CHANNELS.openHelp, payload)
  },
}

contextBridge.exposeInMainWorld('tramaApi', tramaApi)
contextBridge.exposeInMainWorld('tramaCaptureMode', {
  helpScreenshots: process.env.TRAMA_CAPTURE_HELP_SCREENSHOTS === '1',
})

