import type {
  AiExportRequest,
  AiExportResponse,
  AiExportPickStagingRequest,
  AiExportPickStagingResponse,
  AiImportPreview,
  AiImportRequest,
  AiImportResponse,
  BookExportRequest,
  BookExportResponse,
  CreateDocumentRequest,
  CreateDocumentResponse,
  CreateMapDocumentRequest,
  CreateMapDocumentResponse,
  SelectMapImageResponse,
  CreateFolderRequest,
  CreateFolderResponse,
  DeleteFolderRequest,
  DeleteFolderResponse,
  DeleteDocumentRequest,
  DeleteDocumentResponse,
  DebugLogRequest,
  ExternalFileEvent,
  FullscreenChangedEvent,
  GitHistoryStatusResponse,
  IpcEnvelope,
  ListDocumentRevisionsRequest,
  ListDocumentRevisionsResponse,
  LoadDocumentRevisionRequest,
  LoadDocumentRevisionResponse,
  CloseProjectResponse,
  OpenProjectRequest,
  RevealProjectInFileManagerRequest,
  RevealProjectInFileManagerResponse,
  PingRequest,
  PingResponse,
  ProjectIndex,
  ProjectSnapshot,
  ReadDocumentRequest,
  ReadDocumentResponse,
  ReadImageFileRequest,
  ReadImageFileResponse,
  ReadDocumentRevisionRequest,
  ReadDocumentRevisionResponse,
  RenameDocumentRequest,
  RenameDocumentResponse,
  RenameFolderRequest,
  RenameFolderResponse,
  SaveDocumentRequest,
  SaveDocumentResponse,
  SaveGitSnapshotRequest,
  SaveGitSnapshotResponse,
  SetSpellcheckSettingsRequest,
  SetFullscreenRequest,
  SetFullscreenResponse,
  SetWindowAppearanceRequest,
  SetWindowAppearanceResponse,
  SelectProjectFolderResponse,
  ValidateProjectFolderRequest,
  ValidateProjectFolderResponse,
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
      closeProject(): Promise<IpcEnvelope<CloseProjectResponse>>
      revealProjectInFileManager(
        payload: RevealProjectInFileManagerRequest,
      ): Promise<IpcEnvelope<RevealProjectInFileManagerResponse>>
      selectProjectFolder(): Promise<IpcEnvelope<SelectProjectFolderResponse>>
      validateProjectFolder(payload: ValidateProjectFolderRequest): Promise<IpcEnvelope<ValidateProjectFolderResponse>>
      readDocument(payload: ReadDocumentRequest): Promise<IpcEnvelope<ReadDocumentResponse>>
      readImageFile(payload: ReadImageFileRequest): Promise<IpcEnvelope<ReadImageFileResponse>>
      saveDocument(payload: SaveDocumentRequest): Promise<IpcEnvelope<SaveDocumentResponse>>
      createDocument(payload: CreateDocumentRequest): Promise<IpcEnvelope<CreateDocumentResponse>>
      createMapDocument(payload: CreateMapDocumentRequest): Promise<IpcEnvelope<CreateMapDocumentResponse>>
      selectMapImage(): Promise<IpcEnvelope<SelectMapImageResponse>>
      createFolder(payload: CreateFolderRequest): Promise<IpcEnvelope<CreateFolderResponse>>
      renameFolder(payload: RenameFolderRequest): Promise<IpcEnvelope<RenameFolderResponse>>
      deleteFolder(payload: DeleteFolderRequest): Promise<IpcEnvelope<DeleteFolderResponse>>
      renameDocument(payload: RenameDocumentRequest): Promise<IpcEnvelope<RenameDocumentResponse>>
      deleteDocument(payload: DeleteDocumentRequest): Promise<IpcEnvelope<DeleteDocumentResponse>>
      getIndex(): Promise<IpcEnvelope<ProjectIndex>>
      setFullscreen(payload: SetFullscreenRequest): Promise<IpcEnvelope<SetFullscreenResponse>>
      revealMenuBar(): Promise<void>
      hideMenuBar(): Promise<void>
      setWindowAppearance(payload: SetWindowAppearanceRequest): Promise<IpcEnvelope<SetWindowAppearanceResponse>>
      getSpellcheckSettings(): Promise<IpcEnvelope<SpellcheckSettingsResponse>>
      setSpellcheckSettings(payload: SetSpellcheckSettingsRequest): Promise<IpcEnvelope<SpellcheckSettingsResponse>>
      onExternalFileEvent(callback: (event: ExternalFileEvent) => void): () => void
      onFullscreenChanged(callback: (event: FullscreenChangedEvent) => void): () => void
      onReloadProjectRequested(callback: () => void): () => void
      aiImportPreview(payload: AiImportRequest): Promise<IpcEnvelope<AiImportPreview>>
      aiImport(payload: AiImportRequest): Promise<IpcEnvelope<AiImportResponse>>
      aiExport(payload: AiExportRequest): Promise<IpcEnvelope<AiExportResponse>>
      aiExportPickStaging(payload: AiExportPickStagingRequest): Promise<IpcEnvelope<AiExportPickStagingResponse>>
      bookExport(payload: BookExportRequest): Promise<IpcEnvelope<BookExportResponse>>
      gitHistoryStatus(): Promise<IpcEnvelope<GitHistoryStatusResponse>>
      saveGitSnapshot(payload: SaveGitSnapshotRequest): Promise<IpcEnvelope<SaveGitSnapshotResponse>>
      listDocumentRevisions(payload: ListDocumentRevisionsRequest): Promise<IpcEnvelope<ListDocumentRevisionsResponse>>
      readDocumentRevision(payload: ReadDocumentRevisionRequest): Promise<IpcEnvelope<ReadDocumentRevisionResponse>>
      loadDocumentRevision(payload: LoadDocumentRevisionRequest): Promise<IpcEnvelope<LoadDocumentRevisionResponse>>
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
