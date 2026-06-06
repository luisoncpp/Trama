import { canSelectFile } from '../../project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import type { WorkspaceLayoutState, WorkspacePane } from '../../project-editor-types'
import type { PaneWorkspace } from '../../pane'

function updatePathForPane(layout: WorkspaceLayoutState, pane: WorkspacePane, path: string): WorkspaceLayoutState {
  return pane === 'primary'
    ? { ...layout, primaryPath: path }
    : { ...layout, secondaryPath: path }
}

function assignFileToPane(
  filePath: string,
  pane: WorkspacePane,
  setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void,
): void {
  setWorkspaceLayout((previous) => updatePathForPane(previous, pane, filePath))
}

async function openHistoryPathInPane(
  filePath: string,
  pane: WorkspacePane,
  deps: {
    workspace: PaneWorkspace
    setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void
    setStatusMessage?: (value: string) => void
    loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  },
): Promise<void> {
  deps.workspace.exitRevisionPreview(pane)
  if (pane === 'primary') {
    const primaryPaneState = deps.workspace.primary
    const primaryPanePath = deps.workspace.layout.primaryPath
    if (!canSelectFile(primaryPaneState.isDirty, primaryPanePath, filePath)) {
      deps.setStatusMessage?.(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
      return
    }
  }

  assignFileToPane(filePath, pane, deps.setWorkspaceLayout)

  if (pane === 'secondary') {
    deps.setWorkspaceLayout((previous) => ({
      ...previous,
      mode: previous.mode === 'single' ? 'split' : previous.mode,
      activePane: 'secondary',
    }))
  } else {
    deps.setWorkspaceLayout((previous) => ({
      ...previous,
      activePane: 'primary',
    }))
  }

  const loadedPath = pane === 'secondary' ? deps.workspace.secondary.path : deps.workspace.primary.path
  if (loadedPath !== filePath) {
    await deps.loadDocument(filePath, pane)
  }
}

export async function openPreviousInPaneHistory(
  pane: WorkspacePane | undefined,
  deps: {
    workspace: PaneWorkspace
    setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void
    setStatusMessage: (value: string) => void
    loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  },
): Promise<void> {
  const targetPane = pane ?? deps.workspace.layout.activePane
  const targetPath = deps.workspace.getPreviousPathInPaneHistory(targetPane)
  if (!targetPath) return
  deps.workspace.stepPaneNavigationHistory(targetPane, -1)
  await openHistoryPathInPane(targetPath, targetPane, deps)
}

export async function openNextInPaneHistory(
  pane: WorkspacePane | undefined,
  deps: {
    workspace: PaneWorkspace
    setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void
    setStatusMessage: (value: string) => void
    loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  },
): Promise<void> {
  const targetPane = pane ?? deps.workspace.layout.activePane
  const targetPath = deps.workspace.getNextPathInPaneHistory(targetPane)
  if (!targetPath) return
  deps.workspace.stepPaneNavigationHistory(targetPane, 1)
  await openHistoryPathInPane(targetPath, targetPane, deps)
}
