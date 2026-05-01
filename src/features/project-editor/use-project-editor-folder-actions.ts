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
import type { ProjectEditorLayoutState, ProjectEditorPaneState, ProjectEditorProjectState } from './project-editor-types'

interface UseProjectEditorFolderActionsParams {
  layoutState: ProjectEditorLayoutState
  paneState: ProjectEditorPaneState
  projectState: ProjectEditorProjectState
  setters: {
    setStatusMessage: (value: string) => void
    setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void
    setPrimaryPane: (value: any) => void
    setSecondaryPane: (value: any) => void
  }
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
}

function preferredPathFromLayout(layout: WorkspaceLayoutState): string | null {
  return layout.activePane === 'secondary' ? layout.secondaryPath : layout.primaryPath
}

async function executeFolderRename(
  layoutState: ProjectEditorLayoutState,
  paneState: ProjectEditorPaneState,
  projectState: ProjectEditorProjectState,
  setters: UseProjectEditorFolderActionsParams['setters'],
  openProject: UseProjectEditorFolderActionsParams['openProject'],
  input: SidebarRenameInput,
): Promise<void> {
  if (!projectState.rootPath) {
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  if (isInvalidRenameInput(input)) {
    setters.setStatusMessage('Provide a valid folder name without path separators.')
    return
  }

  if (hasDirtyPathInsideFolder(paneState, input.path)) {
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
    layoutState.workspaceLayout,
    response.data.path,
    response.data.renamedTo,
  )
  noteSidebarFolderRenamed(response.data.path, response.data.renamedTo)
  setters.setWorkspaceLayout(remappedLayout)
  setters.setStatusMessage(`Renamed folder: ${response.data.renamedTo}`)
  await openProject(projectState.rootPath, preferredPathFromLayout(remappedLayout) ?? undefined, remappedLayout.activePane)
}

async function executeFolderDelete(
  layoutState: ProjectEditorLayoutState,
  paneState: ProjectEditorPaneState,
  projectState: ProjectEditorProjectState,
  setters: UseProjectEditorFolderActionsParams['setters'],
  openProject: UseProjectEditorFolderActionsParams['openProject'],
  path: string,
): Promise<void> {
  if (!projectState.rootPath) {
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  if (!path) {
    setters.setStatusMessage('Select a valid folder path to delete.')
    return
  }

  if (hasDirtyPathInsideFolder(paneState, path)) {
    setters.setStatusMessage('Save or wait for autosave before deleting a folder that contains open unsaved files.')
    return
  }

  const response = await window.tramaApi.deleteFolder({ path })
  if (!response.ok) {
    setters.setStatusMessage(`Could not delete folder: ${response.error.message}`)
    return
  }

  const nextLayout = pruneWorkspaceLayoutPathsForFolderDelete(layoutState.workspaceLayout, response.data.path)
  setters.setWorkspaceLayout(nextLayout)
  setters.setStatusMessage(`Deleted folder: ${response.data.path}`)
  await openProject(projectState.rootPath, preferredPathFromLayout(nextLayout) ?? undefined, nextLayout.activePane)
}

async function executeFolderMove(
  layoutState: ProjectEditorLayoutState,
  paneState: ProjectEditorPaneState,
  projectState: ProjectEditorProjectState,
  setters: UseProjectEditorFolderActionsParams['setters'],
  openProject: UseProjectEditorFolderActionsParams['openProject'],
  sourcePath: string,
  targetParent: string,
): Promise<void> {
  if (!projectState.rootPath) {
    setters.setStatusMessage('No project is open')
    return
  }

  if (hasDirtyPathInsideFolder(paneState, sourcePath)) {
    setters.setStatusMessage('Save or wait for autosave before moving a folder that contains open unsaved files.')
    return
  }

  const response = await window.tramaApi.moveFolder({ sourcePath, targetParent })
  if (!response.ok) {
    setters.setStatusMessage(`Could not move folder: ${response.error.message}`)
    return
  }

  const remappedLayout = remapWorkspaceLayoutPathsForFolderRename(
    layoutState.workspaceLayout,
    response.data.sourcePath,
    response.data.renamedTo,
  )
  setters.setWorkspaceLayout(remappedLayout)
  setters.setStatusMessage(`Moved folder to: ${response.data.renamedTo}`)
  await openProject(
    projectState.rootPath,
    preferredPathFromLayout(remappedLayout) ?? undefined,
    remappedLayout.activePane,
  )
}

export function useProjectEditorFolderActions({
  layoutState,
  paneState,
  projectState,
  setters,
  openProject,
}: UseProjectEditorFolderActionsParams): {
  renameFolder: ProjectEditorActions['renameFolder']
  deleteFolder: ProjectEditorActions['deleteFolder']
  moveFolder: ProjectEditorActions['moveFolder']
} {
  const renameFolder = useCallback(
    (input: SidebarRenameInput) => executeFolderRename(layoutState, paneState, projectState, setters, openProject, input),
    [layoutState, paneState, projectState, openProject, setters],
  )
  const deleteFolder = useCallback(
    (path: string) => executeFolderDelete(layoutState, paneState, projectState, setters, openProject, path),
    [layoutState, paneState, projectState, openProject, setters],
  )
  const moveFolder = useCallback(
    (sourcePath: string, targetParent: string) => executeFolderMove(layoutState, paneState, projectState, setters, openProject, sourcePath, targetParent),
    [layoutState, paneState, projectState, openProject, setters],
  )
  return { renameFolder, deleteFolder, moveFolder }
}
