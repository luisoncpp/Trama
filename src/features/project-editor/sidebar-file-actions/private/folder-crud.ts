import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import {
  remapWorkspaceLayoutPathsForFolderRename,
  pruneWorkspaceLayoutPathsForFolderDelete,
  hasDirtyPathInsideFolderUsingWorkspace,
} from '../../project-editor-folder-logic'
import { noteSidebarFolderRenamed } from '../../components/sidebar/sidebar-folder-rename-events'
import { normalizeName, isInvalidRenameInput } from '../../../../shared/sidebar-utils'
import type { SidebarRenameInput, WorkspaceLayoutState, ProjectEditorProjectState } from '../../project-editor-types'
import type { PaneWorkspace } from '../../pane'

function preferredPathFromLayout(layout: WorkspaceLayoutState): string | null {
  return layout.activePane === 'secondary' ? layout.secondaryPath : layout.primaryPath
}

export async function renameFolder(
  input: SidebarRenameInput,
  deps: {
    workspace: PaneWorkspace
    projectState: ProjectEditorProjectState
    setStatusMessage: (value: string) => void
    setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void
    openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  if (isInvalidRenameInput(input)) {
    deps.setStatusMessage('Provide a valid folder name without path separators.')
    return
  }

  if (hasDirtyPathInsideFolderUsingWorkspace(deps.workspace, input.path)) {
    deps.setStatusMessage('Save or wait for autosave before renaming a folder that contains open unsaved files.')
    return
  }

  const response = await window.tramaApi.renameFolder({
    path: input.path,
    newName: normalizeName(input.newName),
  })
  if (!response.ok) {
    deps.setStatusMessage(`Could not rename folder: ${response.error.message}`)
    return
  }

  const remappedLayout = remapWorkspaceLayoutPathsForFolderRename(
    deps.workspace.layout,
    response.data.path,
    response.data.renamedTo,
  )
  noteSidebarFolderRenamed(response.data.path, response.data.renamedTo)
  deps.setWorkspaceLayout(remappedLayout)
  deps.setStatusMessage(`Renamed folder: ${response.data.renamedTo}`)
  await deps.openProject(deps.projectState.rootPath, preferredPathFromLayout(remappedLayout) ?? undefined, remappedLayout.activePane)
}

export async function deleteFolder(
  path: string,
  deps: {
    workspace: PaneWorkspace
    projectState: ProjectEditorProjectState
    setStatusMessage: (value: string) => void
    setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void
    openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  if (!path) {
    deps.setStatusMessage('Select a valid folder path to delete.')
    return
  }

  if (hasDirtyPathInsideFolderUsingWorkspace(deps.workspace, path)) {
    deps.setStatusMessage('Save or wait for autosave before deleting a folder that contains open unsaved files.')
    return
  }

  const response = await window.tramaApi.deleteFolder({ path })
  if (!response.ok) {
    deps.setStatusMessage(`Could not delete folder: ${response.error.message}`)
    return
  }

  const nextLayout = pruneWorkspaceLayoutPathsForFolderDelete(deps.workspace.layout, response.data.path)
  deps.setWorkspaceLayout(nextLayout)
  deps.setStatusMessage(`Deleted folder: ${response.data.path}`)
  await deps.openProject(deps.projectState.rootPath, preferredPathFromLayout(nextLayout) ?? undefined, nextLayout.activePane)
}

export async function moveFolder(
  sourcePath: string,
  targetParent: string,
  deps: {
    workspace: PaneWorkspace
    projectState: ProjectEditorProjectState
    setStatusMessage: (value: string) => void
    setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void
    openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage('No project is open')
    return
  }

  if (hasDirtyPathInsideFolderUsingWorkspace(deps.workspace, sourcePath)) {
    deps.setStatusMessage('Save or wait for autosave before moving a folder that contains open unsaved files.')
    return
  }

  const response = await window.tramaApi.moveFolder({ sourcePath, targetParent })
  if (!response.ok) {
    deps.setStatusMessage(`Could not move folder: ${response.error.message}`)
    return
  }

  const remappedLayout = remapWorkspaceLayoutPathsForFolderRename(
    deps.workspace.layout,
    response.data.sourcePath,
    response.data.renamedTo,
  )
  deps.setWorkspaceLayout(remappedLayout)
  deps.setStatusMessage(`Moved folder to: ${response.data.renamedTo}`)
  await deps.openProject(
    deps.projectState.rootPath,
    preferredPathFromLayout(remappedLayout) ?? undefined,
    remappedLayout.activePane,
  )
}
