import type { GitHistoryStatusResponse } from '../../shared/ipc.js'
import type { GitHistoryState, RevisionRailState } from './project-editor-types'

export function createEmptyRevisionRailState(): RevisionRailState {
  return {
    open: false,
    documentPath: null,
    loading: false,
    error: null,
    revisions: [],
    cursor: null,
    hasMore: false,
    latestRevisionValue: null,
    selected: { kind: 'current' },
    previewValue: null,
    previewReadOnly: false,
    previewVersion: 0,
    currentLabel: 'Current',
    confirmation: {
      open: false,
      revision: null,
    },
  }
}

export function createEmptyGitHistoryState(): GitHistoryState {
  return {
    gitAvailable: false,
    repositoryRoot: null,
    usesParentRepository: false,
    needsInitialization: false,
    loading: false,
  }
}

export function mapGitHistoryStatusToState(status: GitHistoryStatusResponse): GitHistoryState {
  return {
    gitAvailable: status.gitAvailable,
    repositoryRoot: status.repositoryRoot,
    usesParentRepository: status.usesParentRepository,
    needsInitialization: status.needsInitialization,
    loading: false,
  }
}
