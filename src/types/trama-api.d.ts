import type {
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
      openProject(payload: OpenProjectRequest): Promise<IpcEnvelope<ProjectSnapshot>>
      selectProjectFolder(): Promise<IpcEnvelope<SelectProjectFolderResponse>>
      readDocument(payload: ReadDocumentRequest): Promise<IpcEnvelope<ReadDocumentResponse>>
      saveDocument(payload: SaveDocumentRequest): Promise<IpcEnvelope<SaveDocumentResponse>>
      getIndex(): Promise<IpcEnvelope<ProjectIndex>>
      onExternalFileEvent(callback: (event: ExternalFileEvent) => void): () => void
    }
  }
}

export {}
