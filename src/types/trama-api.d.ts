import type {
  CreateDocumentRequest,
  CreateDocumentResponse,
  CreateFolderRequest,
  CreateFolderResponse,
  DebugLogRequest,
  ExternalFileEvent,
  IpcEnvelope,
  OpenProjectRequest,
  PingRequest,
  PingResponse,
  ProjectIndex,
  ProjectSnapshot,
  ReadDocumentRequest,
  ReadDocumentResponse,
  SaveDocumentRequest,
  SaveDocumentResponse,
  SelectProjectFolderResponse,
} from '../shared/ipc'

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
      getIndex(): Promise<IpcEnvelope<ProjectIndex>>
      onExternalFileEvent(callback: (event: ExternalFileEvent) => void): () => void
    }
  }
}

export {}
