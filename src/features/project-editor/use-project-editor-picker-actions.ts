import { useCallback } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions } from './project-editor-types'

export function usePickProjectFolderAction({
  openProject,
  setters,
}: {
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setters: { setStatusMessage: (value: string) => void }
}): ProjectEditorActions['pickProjectFolder'] {
  return useCallback(/* pickProjectFolderAction */ async (): Promise<void> => {
    const selected = await window.tramaApi.selectProjectFolder()
    if (!selected.ok) {
      setters.setStatusMessage(`Could not open folder picker: ${selected.error.message}`)
      return
    }

    if (!selected.data.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.folderSelectionCanceled)
      return
    }

    await openProject(selected.data.rootPath)
  }, [openProject, setters] /*Inputs for pickProjectFolderAction*/)
}

export function useProjectPickerActions({
  openProject,
  setters,
}: {
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setters: { setStatusMessage: (value: string) => void }
}) {
  return { pickProjectFolder: usePickProjectFolderAction({ openProject, setters }) }
}