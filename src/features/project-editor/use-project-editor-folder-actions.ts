import { useCallback } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import {
  remapWorkspaceLayoutPathsForFolderRename,
  pruneWorkspaceLayoutPathsForFolderDelete,
  hasDirtyPathInsideFolder,
} from './project-editor-folder-logic'
import { noteSidebarFolderRenamed } from './components/sidebar/sidebar-folder-rename-events'
import { normalizeName, isInvalidRenameInput } from '../../shared/sidebar-utils'
import type { ProjectEditorActions, SidebarRenameInput, WorkspaceLayoutState } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

interface UseProjectEditorFolderActionsParams {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
}

function preferredPathFromLayout(layout: WorkspaceLayoutState): string | null {
  return layout.activePane === 'secondary' ? layout.secondaryPath : layout.primaryPath
}

async function executeFolderRename(
  values: UseProjectEditorFolderActionsParams['values'],
  setters: UseProjectEditorFolderActionsParams['setters'],
  openProject: UseProjectEditorFolderActionsParams['openProject'],
  input: SidebarRenameInput,
): Promise<void> {
  if (!values.rootPath) {
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  if (isInvalidRenameInput(input)) {
    setters.setStatusMessage('Provide a valid folder name without path separators.')
    return
  }

  if (hasDirtyPathInsideFolder(values, input.path)) {
    setters.setStatusMessage('Save or wait for autosave before renaming a folder that contains open unsaved files.')
    return
  }

  const response = await window.tramaApi.renameFolder({
    path: input.path,
    newName: normalizeName(input.newName),
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
  setters.setWorkspaceLayout(remappedLayout)
  setters.setStatusMessage(`Renamed folder: ${response.data.renamedTo}`)
  await openProject(values.rootPath, preferredPathFromLayout(remappedLayout) ?? undefined, remappedLayout.activePane)
}

async function executeFolderDelete(
  values: UseProjectEditorFolderActionsParams['values'],
  setters: UseProjectEditorFolderActionsParams['setters'],
  openProject: UseProjectEditorFolderActionsParams['openProject'],
  path: string,
): Promise<void> {
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
  setters.setWorkspaceLayout(nextLayout)
  setters.setStatusMessage(`Deleted folder: ${response.data.path}`)
  await openProject(values.rootPath, preferredPathFromLayout(nextLayout) ?? undefined, nextLayout.activePane)
}

async function executeFolderMove(
  values: UseProjectEditorFolderActionsParams['values'],
  setters: UseProjectEditorFolderActionsParams['setters'],
  openProject: UseProjectEditorFolderActionsParams['openProject'],
  sourcePath: string,
  targetParent: string,
): Promise<void> {
  if (!values.rootPath) {
    setters.setStatusMessage('No project is open')
    return
  }

  if (hasDirtyPathInsideFolder(values, sourcePath)) {
    setters.setStatusMessage('Save or wait for autosave before moving a folder that contains open unsaved files.')
    return
  }

  const response = await window.tramaApi.moveFolder({ sourcePath, targetParent })
  if (!response.ok) {
    setters.setStatusMessage(`Could not move folder: ${response.error.message}`)
    return
  }

  const remappedLayout = remapWorkspaceLayoutPathsForFolderRename(
    values.workspaceLayout,
    response.data.sourcePath,
    response.data.renamedTo,
  )
  setters.setWorkspaceLayout(remappedLayout)
  setters.setStatusMessage(`Moved folder to: ${response.data.renamedTo}`)
  await openProject(
    values.rootPath,
    preferredPathFromLayout(remappedLayout) ?? undefined,
    remappedLayout.activePane,
  )
}

export function useProjectEditorFolderActions({
  values,
  setters,
  openProject,
}: UseProjectEditorFolderActionsParams): {
  renameFolder: ProjectEditorActions['renameFolder']
  deleteFolder: ProjectEditorActions['deleteFolder']
  moveFolder: ProjectEditorActions['moveFolder']
} {
  const renameFolder = useCallback(
    (input: SidebarRenameInput) => executeFolderRename(values, setters, openProject, input),
    [openProject, setters, values],
  )
  const deleteFolder = useCallback(
    (path: string) => executeFolderDelete(values, setters, openProject, path),
    [openProject, setters, values],
  )
  const moveFolder = useCallback(
    (sourcePath: string, targetParent: string) => executeFolderMove(values, setters, openProject, sourcePath, targetParent),
    [openProject, setters, values],
  )
  return { renameFolder, deleteFolder, moveFolder }
}
