import type { FocusScope, ProjectEditorActions, WorkspacePane } from '../project-editor-types'
import type { DocumentMeta } from '../../../shared/ipc'
import { buildGitHistoryActions } from '../git-history-actions'
import * as workspaceActions from '../workspace-actions'
import type { ActionGroupParams } from './action-group-types'

export function buildWorkspaceActions(params: ActionGroupParams): Pick<ProjectEditorActions,
  | 'toggleWorkspaceLayoutMode'
  | 'setWorkspaceLayoutRatio'
  | 'setWorkspaceActivePane'
  | 'openFileInPane'
  | 'openPreviousInPaneHistory'
  | 'openNextInPaneHistory'
  | 'setFullscreenEnabled'
  | 'toggleFocusMode'
  | 'setFocusScope'
  | 'setZoomLevel'
  | 'markEditorDirty'
  | 'updateEditorMeta'
  | 'updateEditorValue'
  | 'saveNow'
  | 'revertChanges'
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
    ...buildWorkspaceLayoutActions(params),
    ...buildWorkspaceEditorActions(params),
    ...buildGitHistoryActions(params),
  }
}

function buildWorkspaceLayoutActions({
  layoutState,
  projectState,
  setters,
  paneWorkspace,
  loadDocument,
}: ActionGroupParams) {
  return {
    toggleWorkspaceLayoutMode: () => workspaceActions.toggleWorkspaceLayoutMode(projectState, setters.setWorkspaceLayout),
    setWorkspaceLayoutRatio: (ratio: number) => workspaceActions.setWorkspaceLayoutRatio(ratio, setters.setWorkspaceLayout),
    setWorkspaceActivePane: (pane: WorkspacePane) => workspaceActions.setWorkspaceActivePane(pane, {
      workspace: paneWorkspace,
      setWorkspaceLayout: setters.setWorkspaceLayout,
      setConflictComparisonContent: setters.setConflictComparisonContent,
      setStatusMessage: setters.setStatusMessage,
      loadDocument,
    }),
    openFileInPane: (filePath: string, pane: WorkspacePane) => workspaceActions.openFileInPane(filePath, pane, {
      workspace: paneWorkspace,
      setWorkspaceLayout: setters.setWorkspaceLayout,
      setStatusMessage: setters.setStatusMessage,
      loadDocument,
    }),
    openPreviousInPaneHistory: (pane?: WorkspacePane) => workspaceActions.openPreviousInPaneHistory(pane, {
      workspace: paneWorkspace,
      setWorkspaceLayout: setters.setWorkspaceLayout,
      setStatusMessage: setters.setStatusMessage,
      loadDocument,
    }),
    openNextInPaneHistory: (pane?: WorkspacePane) => workspaceActions.openNextInPaneHistory(pane, {
      workspace: paneWorkspace,
      setWorkspaceLayout: setters.setWorkspaceLayout,
      setStatusMessage: setters.setStatusMessage,
      loadDocument,
    }),
    setFullscreenEnabled: (enabled: boolean) => workspaceActions.setFullscreenEnabled(enabled, {
      setIsFullscreen: setters.setIsFullscreen,
      setStatusMessage: setters.setStatusMessage,
    }),
    toggleFocusMode: () => workspaceActions.toggleFocusMode(
      layoutState.workspaceLayout,
      setters.setSidebarPanelCollapsed,
      setters.setWorkspaceLayout,
    ),
    setFocusScope: (scope: FocusScope) => workspaceActions.setFocusScope(scope, setters.setWorkspaceLayout),
    setZoomLevel: (level: number) => workspaceActions.setZoomLevel(level, setters.setWorkspaceLayout),
  }
}

function buildWorkspaceEditorActions({
  uiState,
  setters,
  paneWorkspace,
  loadDocument,
}: ActionGroupParams) {
  return {
    markEditorDirty: (pane?: WorkspacePane) => workspaceActions.markEditorDirty(pane, paneWorkspace),
    updateEditorMeta: (meta: DocumentMeta, pane?: WorkspacePane) => workspaceActions.updateEditorMeta(meta, pane, paneWorkspace),
    updateEditorValue: (value: string, pane?: WorkspacePane) => workspaceActions.updateEditorValue(value, pane, paneWorkspace),
    saveNow: (pane?: WorkspacePane) => workspaceActions.saveNow(pane, {
      workspace: paneWorkspace,
      uiState,
      setExternalConflictPath: setters.setExternalConflictPath,
      setConflictComparisonContent: setters.setConflictComparisonContent,
    }),
    revertChanges: (pane?: WorkspacePane) => workspaceActions.revertChanges(pane, {
      workspace: paneWorkspace,
      loadDocument,
      setExternalConflictPath: setters.setExternalConflictPath,
      setConflictComparisonContent: setters.setConflictComparisonContent,
      uiState,
    }),
  }
}
