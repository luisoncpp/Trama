import type { ProjectEditorActions, WorkspacePane } from './project-editor-types'
import { createEmptyGitHistoryState, createEmptyRevisionRailState } from './project-editor-git-history-state'
import type { ActionGroupParams } from './project-editor-private/action-group-types'
import { refreshGitHistoryStatus, refreshRevisionRail, resolvePane } from './git-history-helpers'

function setGitHistoryLoading(params: ActionGroupParams): void {
  params.setters.setGitHistory((previous: ReturnType<typeof createEmptyGitHistoryState>) => ({ ...previous, loading: true }))
}

async function refreshOpenRevisionRails(params: ActionGroupParams): Promise<void> {
  await Promise.all((['primary', 'secondary'] as const)
    .filter((pane) => params.paneWorkspace.getPaneDocument(pane).revisionRail.open)
    .map((pane) => refreshRevisionRail(pane, params, { selectCurrent: true })))
}

async function saveSnapshot(params: ActionGroupParams): Promise<void> {
  if (!params.uiState.gitHistory.gitAvailable) return
  try {
    await params.paneWorkspace.saveAllDirtyPanes()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown save error'
    params.setters.setStatusMessage(`Snapshot aborted: ${message}`)
    return
  }
  let initializeRepository = false
  if (params.uiState.gitHistory.needsInitialization) {
    initializeRepository = window.confirm(`Initialize a Git repository at ${params.projectState.rootPath}?`)
    if (!initializeRepository) return
  }
  setGitHistoryLoading(params)
  const response = await window.tramaApi.saveGitSnapshot({ initializeRepository })
  if (!response.ok) {
    params.setters.setStatusMessage(`Snapshot failed: ${response.error.message}`)
    await refreshGitHistoryStatus(params)
    return
  }
  params.setters.setStatusMessage(response.data.message)
  await refreshGitHistoryStatus(params)
  await refreshOpenRevisionRails(params)
}

async function toggleDocumentRevisions(params: ActionGroupParams, path: string, pane?: WorkspacePane): Promise<void> {
  const targetPane = resolvePane(pane, params.paneWorkspace)
  params.paneWorkspace.flushPaneContent(targetPane)
  const rail = params.paneWorkspace.getPaneDocument(targetPane).revisionRail
  if (rail.open && rail.documentPath === path) {
    params.paneWorkspace.updateRevisionRail(targetPane, createEmptyRevisionRailState())
    return
  }
  params.paneWorkspace.exitRevisionPreview(targetPane)
  params.paneWorkspace.updateRevisionRail(targetPane, (previous) => ({
    ...previous,
    open: true,
    documentPath: path,
    latestRevisionValue: null,
    selected: { kind: 'current' },
  }))
  await refreshRevisionRail(targetPane, params, { selectCurrent: true })
}

function closeDocumentRevisions(params: ActionGroupParams, pane?: WorkspacePane): void {
  const targetPane = resolvePane(pane, params.paneWorkspace)
  params.paneWorkspace.updateRevisionRail(targetPane, createEmptyRevisionRailState())
}

async function selectDocumentRevision(params: ActionGroupParams, commitSha: string, pane?: WorkspacePane): Promise<void> {
  const targetPane = resolvePane(pane, params.paneWorkspace)
  const paneState = params.paneWorkspace.getPaneDocument(targetPane)
  const path = paneState.revisionRail.documentPath ?? paneState.path
  const revision = paneState.revisionRail.revisions.find((item) => item.sha === commitSha)
  if (!path || !revision) return
  params.paneWorkspace.updateRevisionRail(targetPane, (previous) => ({ ...previous, loading: true, error: null }))
  const response = await window.tramaApi.readDocumentRevision({ path, commitSha, pathAtRevision: revision.pathAtRevision })
  if (!response.ok) {
    params.paneWorkspace.updateRevisionRail(targetPane, (previous) => ({ ...previous, loading: false, error: response.error.message }))
    return
  }
  params.paneWorkspace.updateRevisionRail(targetPane, (previous) => ({
    ...previous,
    loading: false,
    selected: { kind: 'revision', commitSha },
    previewReadOnly: true,
    previewValue: response.data.content,
    previewVersion: previous.previewVersion + 1,
  }))
}

function requestLoadDocumentRevision(params: ActionGroupParams, pane?: WorkspacePane): void {
  const targetPane = resolvePane(pane, params.paneWorkspace)
  const rail = params.paneWorkspace.getPaneDocument(targetPane).revisionRail
  if (rail.selected.kind !== 'revision') return
  const selectedCommitSha = rail.selected.commitSha
  const revision = rail.revisions.find((item) => item.sha === selectedCommitSha) ?? null
  params.paneWorkspace.updateRevisionRail(targetPane, (previous) => ({
    ...previous,
    confirmation: { open: Boolean(revision), revision },
  }))
}

function cancelLoadDocumentRevision(params: ActionGroupParams, pane?: WorkspacePane): void {
  params.paneWorkspace.updateRevisionRail(resolvePane(pane, params.paneWorkspace), (previous) => ({
    ...previous,
    confirmation: { open: false, revision: null },
  }))
}

async function confirmLoadDocumentRevision(params: ActionGroupParams, pane?: WorkspacePane): Promise<void> {
  const targetPane = resolvePane(pane, params.paneWorkspace)
  const paneState = params.paneWorkspace.getPaneDocument(targetPane)
  const path = paneState.revisionRail.documentPath ?? paneState.path
  const revision = paneState.revisionRail.confirmation.revision
  if (!path || !revision) return
  const response = await window.tramaApi.loadDocumentRevision({
    path,
    commitSha: revision.sha,
    pathAtRevision: revision.pathAtRevision,
  })
  if (!response.ok) {
    params.paneWorkspace.updateRevisionRail(targetPane, (previous) => ({
      ...previous,
      confirmation: { open: false, revision: null },
      error: response.error.message,
    }))
    params.setters.setStatusMessage(`Load revision failed: ${response.error.message}`)
    return
  }
  await params.loadDocument(path, targetPane)
  params.setters.setStatusMessage(`Loaded revision into ${path}`)
  await refreshRevisionRail(targetPane, params, { selectCurrent: true })
}

export function buildGitHistoryActions(params: ActionGroupParams): Pick<ProjectEditorActions,
  | 'saveSnapshot'
  | 'toggleDocumentRevisions'
  | 'closeDocumentRevisions'
  | 'selectRevisionCurrent'
  | 'selectDocumentRevision'
  | 'loadMoreDocumentRevisions'
  | 'requestLoadDocumentRevision'
  | 'cancelLoadDocumentRevision'
  | 'confirmLoadDocumentRevision'
> {
  return {
    saveSnapshot: async () => saveSnapshot(params),
    toggleDocumentRevisions: async (path: string, pane?: WorkspacePane) => toggleDocumentRevisions(params, path, pane),
    closeDocumentRevisions: (pane?: WorkspacePane) => closeDocumentRevisions(params, pane),
    selectRevisionCurrent: (pane?: WorkspacePane) => {
      params.paneWorkspace.exitRevisionPreview(resolvePane(pane, params.paneWorkspace))
    },
    selectDocumentRevision: async (commitSha: string, pane?: WorkspacePane) => selectDocumentRevision(params, commitSha, pane),
    loadMoreDocumentRevisions: async (pane?: WorkspacePane) => {
      await refreshRevisionRail(resolvePane(pane, params.paneWorkspace), params, { append: true })
    },
    requestLoadDocumentRevision: (pane?: WorkspacePane) => requestLoadDocumentRevision(params, pane),
    cancelLoadDocumentRevision: (pane?: WorkspacePane) => cancelLoadDocumentRevision(params, pane),
    confirmLoadDocumentRevision: async (pane?: WorkspacePane) => confirmLoadDocumentRevision(params, pane),
  }
}

export async function syncGitHistoryState(params: Pick<ActionGroupParams, 'projectState' | 'setters'>): Promise<void> {
  await refreshGitHistoryStatus(params)
}
