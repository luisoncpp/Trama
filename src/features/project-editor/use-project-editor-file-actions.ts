import { useCallback } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions, SidebarRenameInput } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

interface UseProjectEditorFileActionsParams {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
}

function normalizeName(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function isInvalidRenameInput(input: SidebarRenameInput): boolean {
  const normalizedName = normalizeName(input.newName)
  return !input.path || normalizedName.length === 0 || normalizedName.includes('/')
}

function useRenameFileAction({
  values,
  setters,
  openProject,
}: UseProjectEditorFileActionsParams): ProjectEditorActions['renameFile'] {
  return useCallback(async (input: SidebarRenameInput): Promise<void> => {
    if (!values.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    if (isInvalidRenameInput(input)) {
      setters.setStatusMessage('Provide a valid file name without path separators.')
      return
    }

    const response = await window.tramaApi.renameDocument({
      path: input.path,
      newName: normalizeName(input.newName),
    })
    if (!response.ok) {
      setters.setStatusMessage(`Could not rename file: ${response.error.message}`)
      return
    }

    setters.setStatusMessage(`Renamed file: ${response.data.renamedTo}`)
    await openProject(values.rootPath, response.data.renamedTo)
  }, [openProject, setters, values.rootPath])
}

function useDeleteFileAction({
  values,
  setters,
  openProject,
}: UseProjectEditorFileActionsParams): ProjectEditorActions['deleteFile'] {
  return useCallback(async (path: string): Promise<void> => {
    if (!values.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    const response = await window.tramaApi.deleteDocument({ path })
    if (!response.ok) {
      setters.setStatusMessage(`Could not delete file: ${response.error.message}`)
      return
    }

    setters.setStatusMessage(`Deleted file: ${response.data.path}`)
    await openProject(values.rootPath)
  }, [openProject, setters, values.rootPath])
}

export function useProjectEditorFileActions({
  values,
  setters,
  openProject,
}: UseProjectEditorFileActionsParams): {
  renameFile: ProjectEditorActions['renameFile']
  deleteFile: ProjectEditorActions['deleteFile']
} {
  const renameFile = useRenameFileAction({ values, setters, openProject })
  const deleteFile = useDeleteFileAction({ values, setters, openProject })

  return {
    renameFile,
    deleteFile,
  }
}
