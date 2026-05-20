import type { ProjectEditorProjectState } from '../../project-editor-types'
import type { PaneWorkspace } from '../../pane'

export async function reorderFiles(
  folderPath: string,
  orderedIds: string[],
  deps: {
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string) => Promise<void>
    rootPath: string
  },
): Promise<void> {
  try {
    const response = await window.tramaApi.reorderFiles({ folderPath, orderedIds })
    if (!response.ok) {
      deps.setStatusMessage(`Could not reorder files: ${response.error.message}`)
      return
    }
    deps.setStatusMessage(`File order updated for folder: ${folderPath || '(root)'}`)
    await deps.openProject(deps.rootPath)
  } catch (error) {
    deps.setStatusMessage(`Error reordering files: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function moveFile(
  sourcePath: string,
  targetFolder: string,
  deps: {
    workspace: PaneWorkspace
    projectState: ProjectEditorProjectState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage('No project is open')
    return
  }

  const isSourceDirty =
    (deps.workspace.primary.path === sourcePath && deps.workspace.primary.isDirty) ||
    (deps.workspace.secondary.path === sourcePath && deps.workspace.secondary.isDirty)
  if (isSourceDirty) {
    deps.setStatusMessage('Save the file before moving it.')
    return
  }

  try {
    const response = await window.tramaApi.moveFile({ sourcePath, targetFolder })
    if (!response.ok) {
      deps.setStatusMessage(`Could not move file: ${response.error.message}`)
      return
    }

    deps.setStatusMessage(`Moved file to: ${response.data.renamedTo}`)
    await deps.openProject(deps.projectState.rootPath, response.data.renamedTo)
  } catch (error) {
    deps.setStatusMessage(`Error moving file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
