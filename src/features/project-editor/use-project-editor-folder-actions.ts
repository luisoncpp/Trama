import { useCallback } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import {
  remapWorkspaceLayoutPathsForFolderRename,
  pruneWorkspaceLayoutPathsForFolderDelete,
  isPathInsideFolder,
} from './project-editor-folder-logic'
import { noteSidebarFolderRenamed } from './components/sidebar/sidebar-folder-rename-events'
import type { ProjectEditorActions, SidebarRenameInput } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

interface UseProjectEditorFolderActionsParams {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
}

function normalizeFolderName(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function isInvalidFolderRenameInput(input: SidebarRenameInput): boolean {
  const normalizedName = normalizeFolderName(input.newName)
  return !input.path || normalizedName.length === 0 || normalizedName.includes('/')
}

function hasDirtyPathInsideFolder(values: UseProjectEditorStateResult['values'], folderPath: string): boolean {
  const primaryDirtyInFolder = values.primaryPane.isDirty && isPathInsideFolder(values.primaryPane.path, folderPath)
  const secondaryDirtyInFolder = values.secondaryPane.isDirty && isPathInsideFolder(values.secondaryPane.path, folderPath)
  return primaryDirtyInFolder || secondaryDirtyInFolder
}

export function useProjectEditorFolderActions({
  values,
  setters,
  openProject,
}: UseProjectEditorFolderActionsParams): {
  renameFolder: ProjectEditorActions['renameFolder']
  deleteFolder: ProjectEditorActions['deleteFolder']
} {
  const renameFolder = useCallback(/* renameFolder */ async (input: SidebarRenameInput): Promise<void> => {
    if (!values.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    if (isInvalidFolderRenameInput(input)) {
      setters.setStatusMessage('Provide a valid folder name without path separators.')
      return
    }

    if (hasDirtyPathInsideFolder(values, input.path)) {
      setters.setStatusMessage('Save or wait for autosave before renaming a folder that contains open unsaved files.')
      return
    }

    const response = await window.tramaApi.renameFolder({
      path: input.path,
      newName: normalizeFolderName(input.newName),
    })
    if (!response.ok) {
      setters.setStatusMessage(`Could not rename folder: ${response.error.message}`)
      return
    }

    const remappedLayout = remapWorkspaceLayoutPathsForFolderRename(
      values.workspaceLayout,
      response.data.path,
      response.data.renamedTo,
    )
    noteSidebarFolderRenamed(response.data.path, response.data.renamedTo)
    const preferredFilePath = remappedLayout.activePane === 'secondary'
      ? remappedLayout.secondaryPath
      : remappedLayout.primaryPath

    setters.setWorkspaceLayout(remappedLayout)
    setters.setStatusMessage(`Renamed folder: ${response.data.renamedTo}`)
    await openProject(values.rootPath, preferredFilePath ?? undefined, remappedLayout.activePane)
  }, [openProject, setters, values] /*Inputs for renameFolder*/)

  const deleteFolder = useCallback(/* deleteFolder */ async (path: string): Promise<void> => {
    if (!values.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    if (!path) {
      setters.setStatusMessage('Select a valid folder path to delete.')
      return
    }

    if (hasDirtyPathInsideFolder(values, path)) {
      setters.setStatusMessage('Save or wait for autosave before deleting a folder that contains open unsaved files.')
      return
    }

    const response = await window.tramaApi.deleteFolder({ path })
    if (!response.ok) {
      setters.setStatusMessage(`Could not delete folder: ${response.error.message}`)
      return
    }

    const nextLayout = pruneWorkspaceLayoutPathsForFolderDelete(values.workspaceLayout, response.data.path)
    const preferredFilePath = nextLayout.activePane === 'secondary'
      ? nextLayout.secondaryPath
      : nextLayout.primaryPath

    setters.setWorkspaceLayout(nextLayout)
    setters.setStatusMessage(`Deleted folder: ${response.data.path}`)
    await openProject(values.rootPath, preferredFilePath ?? undefined, nextLayout.activePane)
  }, [openProject, setters, values] /*Inputs for deleteFolder*/)

  return {
    renameFolder,
    deleteFolder,
  }
}
