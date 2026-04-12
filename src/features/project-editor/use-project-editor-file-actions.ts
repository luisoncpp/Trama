import { useCallback } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import { notifyTagIndexRefresh } from './tag-index-events'
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

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of tags) {
    const next = value.trim()
    if (!next) {
      continue
    }

    const key = next.toLocaleLowerCase()
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    normalized.push(next)
  }

  return normalized
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

function useEditFileTagsAction({ values, setters }: UseProjectEditorFileActionsParams): ProjectEditorActions['editFileTags'] {
  return useCallback(async (path: string, tags: string[]): Promise<void> => {
    if (!values.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    const isTargetDirty =
      (values.primaryPane.path === path && values.primaryPane.isDirty) ||
      (values.secondaryPane.path === path && values.secondaryPane.isDirty)
    if (isTargetDirty) {
      setters.setStatusMessage('Save or wait for autosave before editing tags on this file.')
      return
    }

    const readResponse = await window.tramaApi.readDocument({ path })
    if (!readResponse.ok) {
      setters.setStatusMessage(`Could not load file tags: ${readResponse.error.message}`)
      return
    }

    const normalizedTags = normalizeTags(tags)
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

    setters.setPrimaryPane((prev) => prev.path === path ? { ...prev, meta: nextMeta } : prev)
    setters.setSecondaryPane((prev) => prev.path === path ? { ...prev, meta: nextMeta } : prev)
    notifyTagIndexRefresh()
    setters.setStatusMessage(`Updated tags: ${saveResponse.data.path}`)
  }, [setters, values.primaryPane.isDirty, values.primaryPane.path, values.rootPath, values.secondaryPane.isDirty, values.secondaryPane.path])
}

export function useProjectEditorFileActions({
  values,
  setters,
  openProject,
}: UseProjectEditorFileActionsParams): {
  renameFile: ProjectEditorActions['renameFile']
  deleteFile: ProjectEditorActions['deleteFile']
  editFileTags: ProjectEditorActions['editFileTags']
} {
  const renameFile = useRenameFileAction({ values, setters, openProject })
  const deleteFile = useDeleteFileAction({ values, setters, openProject })
  const editFileTags = useEditFileTagsAction({ values, setters, openProject })

  return {
    renameFile,
    deleteFile,
    editFileTags,
  }
}
