import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'

export async function revealProjectInFileManager(
  projectRootPath: string,
  setStatusMessage: (message: string) => void,
): Promise<void> {
  if (!projectRootPath.trim()) {
    return
  }

  if (!window.tramaApi?.revealProjectInFileManager) {
    setStatusMessage('Preload API unavailable. Reopen the app to open the project folder.')
    return
  }

  const response = await window.tramaApi.revealProjectInFileManager({ rootPath: projectRootPath })
  if (!response.ok) {
    setStatusMessage(`Could not open project folder: ${response.error.message}`)
    return
  }

  setStatusMessage(PROJECT_EDITOR_STRINGS.projectRevealedInFileManager)
}
