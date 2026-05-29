import type { GitDocumentRevision } from '../../shared/ipc.js'

export type RevisionSelection =
  | { kind: 'current' }
  | { kind: 'revision'; commitSha: string }

export interface RevisionLoadConfirmationState {
  open: boolean
  revision: GitDocumentRevision | null
}

export interface RevisionRailState {
  open: boolean
  documentPath: string | null
  loading: boolean
  error: string | null
  revisions: GitDocumentRevision[]
  cursor: string | null
  hasMore: boolean
  latestRevisionValue: string | null
  selected: RevisionSelection
  previewValue: string | null
  previewReadOnly: boolean
  previewVersion: number
  currentLabel: 'Current' | 'Current changes'
  confirmation: RevisionLoadConfirmationState
}

export interface GitHistoryState {
  gitAvailable: boolean
  repositoryRoot: string | null
  usesParentRepository: boolean
  needsInitialization: boolean
  loading: boolean
}
