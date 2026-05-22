import type { WorkspacePane, WorkspaceLayoutState } from '../../project-editor-types'
import type { PaneWorkspace } from '../../pane'
import { assignFileToActivePane } from '../../workspace-actions'

export async function selectFile(
  filePath: string,
  deps: {
    workspace: PaneWorkspace
    loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
    setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void
  },
): Promise<void> {
  const activePane = deps.workspace.layout.activePane
  const activePaneState = deps.workspace.getPaneDocument(activePane)
  await deps.workspace.savePaneIfDirty(activePane)

  deps.workspace.recordPaneNavigation(activePane, filePath)
  assignFileToActivePane(filePath, activePane, deps.setWorkspaceLayout)
  if (filePath !== activePaneState.path) {
    void deps.loadDocument(filePath, activePane)
  }
}
