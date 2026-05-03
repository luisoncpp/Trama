import { useCallback } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import { notifyTagIndexRefresh } from './tag-index-events'
import { normalizeName, isInvalidRenameInput, deduplicateTags } from '../../shared/sidebar-utils'
import type { ProjectEditorActions, SidebarRenameInput } from './project-editor-types'
import type { ProjectEditorProjectState } from './project-editor-types'
import type { PaneWorkspace } from './pane-workspace'

interface UseProjectEditorFileActionsParams {
  workspace: PaneWorkspace
  projectState: ProjectEditorProjectState
  setters: {
    setStatusMessage: (value: string) => void
    setPrimaryPane: (value: any) => void
    setSecondaryPane: (value: any) => void
  }
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
}

function useRenameFileAction({
  projectState,
  setters,
  openProject,
}: UseProjectEditorFileActionsParams): ProjectEditorActions['renameFile'] {
  return useCallback(/* renameFileAction */ async (input: SidebarRenameInput): Promise<void> => {
    if (!projectState.rootPath) {
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
    await openProject(projectState.rootPath, response.data.renamedTo)
  }, [openProject, setters, projectState.rootPath] /*Inputs for renameFileAction*/)
}

function useDeleteFileAction({
  projectState,
  setters,
  openProject,
}: UseProjectEditorFileActionsParams): ProjectEditorActions['deleteFile'] {
  return useCallback(/* deleteFileAction */ async (path: string): Promise<void> => {
    if (!projectState.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    const response = await window.tramaApi.deleteDocument({ path })
    if (!response.ok) {
      setters.setStatusMessage(`Could not delete file: ${response.error.message}`)
      return
    }

    setters.setStatusMessage(`Deleted file: ${response.data.path}`)
    await openProject(projectState.rootPath)
  }, [openProject, setters, projectState.rootPath] /*Inputs for deleteFileAction*/)
}

function useEditFileTagsAction({ workspace, projectState, setters }: UseProjectEditorFileActionsParams): ProjectEditorActions['editFileTags'] {
  return useCallback(/* editFileTagsAction */ async (path: string, tags: string[]): Promise<void> => {
    if (!projectState.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    const isTargetDirty =
      (workspace.primary.path === path && workspace.primary.isDirty) ||
      (workspace.secondary.path === path && workspace.secondary.isDirty)
    if (isTargetDirty) {
      setters.setStatusMessage('Save or wait for autosave before editing tags on this file.')
      return
    }

    const readResponse = await window.tramaApi.readDocument({ path })
    if (!readResponse.ok) {
      setters.setStatusMessage(`Could not load file tags: ${readResponse.error.message}`)
      return
    }

    const normalizedTags = deduplicateTags(tags)
    const nextMeta = { ...readResponse.data.meta }
    if (normalizedTags.length === 0) {
      delete nextMeta.tags
    } else {
      nextMeta.tags = normalizedTags
    }

    const saveResponse = await window.tramaApi.saveDocument({
      path,
      content: readResponse.data.content,
      meta: nextMeta,
    })
    if (!saveResponse.ok) {
      setters.setStatusMessage(`Could not update tags: ${saveResponse.error.message}`)
      return
    }

    setters.setPrimaryPane((prev: any) => prev.path === path ? { ...prev, meta: nextMeta } : prev)
    setters.setSecondaryPane((prev: any) => prev.path === path ? { ...prev, meta: nextMeta } : prev)
    notifyTagIndexRefresh()
    setters.setStatusMessage(`Updated tags: ${saveResponse.data.path}`)
  }, [setters, workspace, projectState.rootPath] /*Inputs for editFileTagsAction*/)
}

export function useProjectEditorFileActions({
  workspace,
  projectState,
  setters,
  openProject,
}: UseProjectEditorFileActionsParams): {
  renameFile: ProjectEditorActions['renameFile']
  deleteFile: ProjectEditorActions['deleteFile']
  editFileTags: ProjectEditorActions['editFileTags']
} {
  const renameFile = useRenameFileAction({ workspace, projectState, setters, openProject })
  const deleteFile = useDeleteFileAction({ workspace, projectState, setters, openProject })
  const editFileTags = useEditFileTagsAction({ workspace, projectState, setters, openProject })

  return {
    renameFile,
    deleteFile,
    editFileTags,
  }
}
