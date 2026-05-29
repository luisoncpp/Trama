import type { RevisionRailState, WorkspacePane } from './project-editor-types'
import { createEmptyGitHistoryState, mapGitHistoryStatusToState } from './project-editor-git-history-state'
import type { ActionGroupParams } from './project-editor-private/action-group-types'
import { areEquivalentEditorValues } from './pane/rich-markdown-editor/rich-markdown-editor-value-sync'

export function resolvePane(pane: WorkspacePane | undefined, workspace: ActionGroupParams['paneWorkspace']): WorkspacePane {
  return pane ?? workspace.layout.activePane
}

function buildCurrentLabel(currentValue: string, latestRevisionValue: string | null, path: string): RevisionRailState['currentLabel'] {
  if (!latestRevisionValue) {
    return 'Current changes'
  }
  return areEquivalentEditorValues(currentValue, latestRevisionValue, path) ? 'Current' : 'Current changes'
}

async function readLatestRevisionValue(path: string, revision: { sha: string; pathAtRevision: string } | undefined): Promise<string | null> {
  if (!revision) {
    return null
  }
  const response = await window.tramaApi.readDocumentRevision({
    path,
    commitSha: revision.sha,
    pathAtRevision: revision.pathAtRevision,
  })
  return response.ok ? response.data.content : null
}

export async function refreshGitHistoryStatus(params: Pick<ActionGroupParams, 'projectState' | 'setters'>): Promise<void> {
  if (!params.projectState.rootPath || !window.tramaApi?.gitHistoryStatus) {
    params.setters.setGitHistory(createEmptyGitHistoryState())
    return
  }
  params.setters.setGitHistory((previous: ReturnType<typeof createEmptyGitHistoryState>) => ({ ...previous, loading: true }))
  const response = await window.tramaApi.gitHistoryStatus()
  params.setters.setGitHistory(
    response.ok
      ? mapGitHistoryStatusToState(response.data)
      : createEmptyGitHistoryState(),
  )
}

export async function refreshRevisionRail(
  pane: WorkspacePane,
  params: Pick<ActionGroupParams, 'paneWorkspace' | 'setters'>,
  options?: { selectCurrent?: boolean; append?: boolean },
): Promise<void> {
  const paneState = params.paneWorkspace.getPaneDocument(pane)
  const path = paneState.revisionRail.documentPath ?? paneState.path
  if (!path) {
    return
  }
  const cursor = options?.append ? paneState.revisionRail.cursor : null
  params.paneWorkspace.updateRevisionRail(pane, (previous) => ({
    ...previous,
    open: true,
    documentPath: path,
    loading: true,
    error: null,
    confirmation: { open: false, revision: null },
  }))
  const response = await window.tramaApi.listDocumentRevisions({ path, cursor })
  if (!response.ok) {
    params.paneWorkspace.updateRevisionRail(pane, (previous) => ({
      ...previous,
      open: true,
      documentPath: path,
      loading: false,
      error: response.error.message,
    }))
    return
  }
  const latestRevisionValue = options?.append ? null : await readLatestRevisionValue(path, response.data.revisions[0])
  const currentValue = params.paneWorkspace.getPaneDocument(pane).content
  params.paneWorkspace.updateRevisionRail(pane, (previous) => ({
    ...previous,
    open: true,
    documentPath: path,
    loading: false,
    error: null,
    revisions: options?.append ? [...previous.revisions, ...response.data.revisions] : response.data.revisions,
    cursor: response.data.cursor,
    hasMore: response.data.hasMore,
    latestRevisionValue: options?.append ? previous.latestRevisionValue : latestRevisionValue,
    selected: options?.selectCurrent ? { kind: 'current' } : previous.selected,
    previewReadOnly: options?.selectCurrent ? false : previous.previewReadOnly,
    previewValue: options?.selectCurrent ? null : previous.previewValue,
    previewVersion: options?.selectCurrent ? previous.previewVersion + 1 : previous.previewVersion,
    currentLabel: options?.append ? previous.currentLabel : buildCurrentLabel(currentValue, latestRevisionValue, path),
    confirmation: { open: false, revision: null },
  }))
}
