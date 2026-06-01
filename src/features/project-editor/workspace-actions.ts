import { canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { DocumentMeta } from '../../shared/ipc'
import type { WorkspaceLayoutState, WorkspacePane } from './project-editor-types'
import type { PaneWorkspace } from './pane'
export {
  setFullscreenEnabled,
  toggleFocusMode,
  setFocusScope,
  setZoomLevel,
} from './workspace-actions/private/view-modes'
export { openPreviousInPaneHistory, openNextInPaneHistory } from './workspace-actions/private/pane-history'

function updatePathForPane(layout: WorkspaceLayoutState, pane: WorkspacePane, path: string): WorkspaceLayoutState {
  return pane === 'primary'
    ? { ...layout, primaryPath: path }
    : { ...layout, secondaryPath: path }
}

export function assignFileToActivePane(
  filePath: string,
  activePane: WorkspacePane,
  setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void,
): void {
  setWorkspaceLayout((previous) => updatePathForPane(previous, activePane, filePath))
}

export function toggleWorkspaceLayoutMode(
  projectState: { snapshot: { markdownFiles: string[] } | null },
  setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void,
): void {
  setWorkspaceLayout((previous) => {
    if (previous.mode === 'single') {
      const secondaryPath = previous.secondaryPath ?? projectState.snapshot?.markdownFiles.find((path) => path !== previous.primaryPath) ?? null
      return {
        ...previous,
        mode: secondaryPath ? 'split' : 'single',
        secondaryPath,
        activePane: 'primary',
      }
    }
    return {
      ...previous,
      mode: 'single',
      activePane: 'primary',
    }
  })
}

export function setWorkspaceLayoutRatio(
  ratio: number,
  setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void,
): void {
  setWorkspaceLayout((previous) => ({ ...previous, ratio }))
}

export async function setWorkspaceActivePane(
  pane: WorkspacePane,
  deps: {
    workspace: PaneWorkspace
    setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void
    setConflictComparisonContent: (value: string | null) => void
    setStatusMessage: (value: string) => void
    loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  },
): Promise<void> {
  const outgoingPane = deps.workspace.layout.activePane
  await deps.workspace.preparePaneExit(outgoingPane)
  deps.workspace.exitRevisionPreview(pane)

  const nextPath = pane === 'secondary' ? deps.workspace.layout.secondaryPath : deps.workspace.layout.primaryPath

  deps.setWorkspaceLayout((previous) => ({ ...previous, activePane: pane }))

  if (!nextPath) {
    deps.setConflictComparisonContent(null)
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.noFileSelected)
    return
  }

  const targetPaneState = pane === 'secondary' ? deps.workspace.secondary : deps.workspace.primary
  if (targetPaneState.path !== nextPath) {
    void deps.loadDocument(nextPath, pane)
  }
}

export function openFileInPane(
  filePath: string,
  pane: WorkspacePane,
  deps: {
    workspace: PaneWorkspace
    setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void
    setStatusMessage: (value: string) => void
    loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  },
): void {
  deps.workspace.exitRevisionPreview(pane)
  deps.workspace.recordPaneNavigation(pane, filePath)
  if (pane === 'secondary') {
    const shouldLoad = deps.workspace.secondary.path !== filePath

    deps.setWorkspaceLayout((previous) => ({
      ...previous,
      mode: previous.mode === 'single' ? 'split' : previous.mode,
      activePane: 'secondary',
      secondaryPath: filePath,
    }))

    if (shouldLoad) {
      void deps.loadDocument(filePath, 'secondary')
    }
  } else {
    const primaryPaneState = deps.workspace.primary
    const primaryPanePath = deps.workspace.layout.primaryPath
    if (!canSelectFile(primaryPaneState.isDirty, primaryPanePath, filePath)) {
      deps.setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
      return
    }

    deps.setWorkspaceLayout((previous) => ({
      ...previous,
      activePane: 'primary',
      primaryPath: filePath,
    }))

    if (primaryPanePath !== filePath) {
      void deps.loadDocument(filePath, 'primary')
    }
  }
}

export function updateEditorValue(
  nextValue: string,
  pane: WorkspacePane | undefined,
  workspace: PaneWorkspace,
): void {
  const targetPane = pane ?? workspace.layout.activePane
  workspace.updatePaneContent(targetPane, nextValue)
}

export function updateEditorMeta(
  nextMeta: DocumentMeta,
  pane: WorkspacePane | undefined,
  workspace: PaneWorkspace,
): void {
  const targetPane = pane ?? workspace.layout.activePane
  workspace.updatePaneMetaForPane(targetPane, nextMeta)
}

export function markEditorDirty(
  pane: WorkspacePane | undefined,
  workspace: PaneWorkspace,
): void {
  const targetPane = pane ?? workspace.layout.activePane
  workspace.markPaneDirty(targetPane)
}

export async function saveNow(
  pane: WorkspacePane | undefined,
  deps: {
    workspace: PaneWorkspace
    uiState: { saving: boolean; externalConflictPath: string | null }
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
  },
): Promise<void> {
  const targetPane = pane ?? deps.workspace.layout.activePane
  const paneStateLocal = deps.workspace.getPaneDocument(targetPane)
  if (!paneStateLocal.path || deps.uiState.saving || !paneStateLocal.isDirty) {
    return
  }
  const result = await deps.workspace.savePaneNow(targetPane)
  if (result.kind === 'saved' && result.path === deps.uiState.externalConflictPath) {
    deps.setExternalConflictPath(null)
    deps.setConflictComparisonContent(null)
  }
}

export function revertChanges(
  pane: WorkspacePane | undefined,
  deps: {
    workspace: PaneWorkspace
    loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    uiState: { externalConflictPath: string | null }
  },
): void {
  const targetPane = pane ?? deps.workspace.layout.activePane
  const result = deps.workspace.preparePaneRevert(targetPane)
  if (result.kind !== 'reverted') {
    return
  }
  if (result.path === deps.uiState.externalConflictPath) {
    deps.setExternalConflictPath(null)
    deps.setConflictComparisonContent(null)
  }
  void deps.loadDocument(result.path, targetPane)
}
