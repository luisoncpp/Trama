import type {
  AiExportRequest,
  AiExportResponse,
  AiImportPreview,
  AiImportRequest,
  AiImportResponse,
  BookExportRequest,
  BookExportResponse,
  CreateDocumentRequest,
  CreateDocumentResponse,
  CreateFolderRequest,
  CreateFolderResponse,
  DeleteFolderRequest,
  DeleteFolderResponse,
  DeleteDocumentRequest,
  DeleteDocumentResponse,
  DebugLogRequest,
  ExternalFileEvent,
  FullscreenChangedEvent,
  IpcEnvelope,
  OpenProjectRequest,
  PingRequest,
  PingResponse,
  ProjectIndex,
  ProjectSnapshot,
  ReadDocumentRequest,
  ReadDocumentResponse,
  RenameDocumentRequest,
  RenameDocumentResponse,
  RenameFolderRequest,
  RenameFolderResponse,
  SaveDocumentRequest,
  SaveDocumentResponse,
  SetSpellcheckSettingsRequest,
  SetFullscreenRequest,
  SetFullscreenResponse,
  SelectProjectFolderResponse,
  SpellcheckSettingsResponse,
  ReorderFilesRequest,
  ReorderFilesResponse,
  MoveFileRequest,
  MoveFileResponse,
  MoveFolderRequest,
  MoveFolderResponse,
  NotifyCloseState,
  ZuluImportPreviewRequest,
  ZuluImportPreviewResponse,
  ZuluImportRequest,
  ZuluImportResponse,
  ZuluSelectFileResponse,
} from '../shared/ipc'
import type { TagGetIndexResponse, TagResolveRequest, TagResolveResponse } from '../shared/ipc-tag'

declare global {
  interface Window {
    tramaApi: {
      ping(payload: PingRequest): Promise<IpcEnvelope<PingResponse>>
      debugLog(payload: DebugLogRequest): Promise<void>
      openProject(payload: OpenProjectRequest): Promise<IpcEnvelope<ProjectSnapshot>>
      selectProjectFolder(): Promise<IpcEnvelope<SelectProjectFolderResponse>>
      readDocument(payload: ReadDocumentRequest): Promise<IpcEnvelope<ReadDocumentResponse>>
      saveDocument(payload: SaveDocumentRequest): Promise<IpcEnvelope<SaveDocumentResponse>>
      createDocument(payload: CreateDocumentRequest): Promise<IpcEnvelope<CreateDocumentResponse>>
      createFolder(payload: CreateFolderRequest): Promise<IpcEnvelope<CreateFolderResponse>>
      renameFolder(payload: RenameFolderRequest): Promise<IpcEnvelope<RenameFolderResponse>>
      deleteFolder(payload: DeleteFolderRequest): Promise<IpcEnvelope<DeleteFolderResponse>>
      renameDocument(payload: RenameDocumentRequest): Promise<IpcEnvelope<RenameDocumentResponse>>
      deleteDocument(payload: DeleteDocumentRequest): Promise<IpcEnvelope<DeleteDocumentResponse>>
      getIndex(): Promise<IpcEnvelope<ProjectIndex>>
      setFullscreen(payload: SetFullscreenRequest): Promise<IpcEnvelope<SetFullscreenResponse>>
      getSpellcheckSettings(): Promise<IpcEnvelope<SpellcheckSettingsResponse>>
      setSpellcheckSettings(payload: SetSpellcheckSettingsRequest): Promise<IpcEnvelope<SpellcheckSettingsResponse>>
      onExternalFileEvent(callback: (event: ExternalFileEvent) => void): () => void
      onFullscreenChanged(callback: (event: FullscreenChangedEvent) => void): () => void
      aiImportPreview(payload: AiImportRequest): Promise<IpcEnvelope<AiImportPreview>>
      aiImport(payload: AiImportRequest): Promise<IpcEnvelope<AiImportResponse>>
      aiExport(payload: AiExportRequest): Promise<IpcEnvelope<AiExportResponse>>
      bookExport(payload: BookExportRequest): Promise<IpcEnvelope<BookExportResponse>>
      getTagIndex(): Promise<IpcEnvelope<TagGetIndexResponse>>
      resolveTag(payload: TagResolveRequest): Promise<IpcEnvelope<TagResolveResponse>>
      reorderFiles(payload: ReorderFilesRequest): Promise<IpcEnvelope<ReorderFilesResponse>>
      moveFile(payload: MoveFileRequest): Promise<IpcEnvelope<MoveFileResponse>>
      moveFolder(payload: MoveFolderRequest): Promise<IpcEnvelope<MoveFolderResponse>>
      notifyCloseState(payload: NotifyCloseState): Promise<void>
      zuluSelectFile(): Promise<IpcEnvelope<ZuluSelectFileResponse>>
      zuluImportPreview(payload: ZuluImportPreviewRequest): Promise<IpcEnvelope<ZuluImportPreviewResponse>>
      zuluImport(payload: ZuluImportRequest): Promise<IpcEnvelope<ZuluImportResponse>>
    }
  }
}

export {}
