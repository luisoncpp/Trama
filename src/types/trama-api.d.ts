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
  SaveDocumentRequest,
  SaveDocumentResponse,
  SetSpellcheckSettingsRequest,
  SetFullscreenRequest,
  SetFullscreenResponse,
  SelectProjectFolderResponse,
  SpellcheckSettingsResponse,
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
    }
  }
}

export {}
