import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'

export async function pickProjectFolder(
  deps: {
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  },
): Promise<void> {
  const selected = await window.tramaApi.selectProjectFolder()
  if (!selected.ok) {
    deps.setStatusMessage(`Could not open folder picker: ${selected.error.message}`)
    return
  }

  if (!selected.data.rootPath) {
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.folderSelectionCanceled)
    return
  }

  await deps.openProject(selected.data.rootPath)
}
