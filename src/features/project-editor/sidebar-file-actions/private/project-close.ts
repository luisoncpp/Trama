import type { ProjectSnapshot } from '../../../../shared/ipc'
import { createEmptyGitHistoryState } from '../../project-editor-git-history-state'
import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'

export interface CloseProjectDeps {
  clearEditor: () => void
  setRootPath: (value: string) => void
  setSnapshot: (value: ProjectSnapshot | null) => void
  clearLastProjectRootPath: () => void
  setGitHistory: (value: ReturnType<typeof createEmptyGitHistoryState>) => void
  setStatusMessage: (message: string) => void
}

export async function closeProject(deps: CloseProjectDeps): Promise<void> {
  if (!window.tramaApi?.closeProject) {
    deps.setStatusMessage('Preload API unavailable. Reopen the app to close projects.')
    return
  }

  const response = await window.tramaApi.closeProject()
  if (!response.ok) {
    deps.setStatusMessage(`Could not close project: ${response.error.message}`)
    return
  }

  deps.clearEditor()
  deps.setRootPath('')
  deps.setSnapshot(null)
  deps.clearLastProjectRootPath()
  deps.setGitHistory(createEmptyGitHistoryState())
  deps.setStatusMessage(PROJECT_EDITOR_STRINGS.projectClosed)
}
