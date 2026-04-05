import { useCallback } from 'preact/hooks'
import { buildConflictCopyPath } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

export function useResolveConflictReloadAction({
  values,
  setters,
  loadDocument,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  loadDocument: (path: string, pane: 'primary' | 'secondary') => Promise<void>
}): ProjectEditorActions['resolveConflictReload'] {
  return useCallback(() => {
    if (values.externalConflictPath) {
      void loadDocument(values.externalConflictPath, values.workspaceLayout.activePane)
    }

    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusReloadDiscarded)
  }, [loadDocument, setters, values.externalConflictPath, values.workspaceLayout.activePane])
}

export function useResolveConflictKeepAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['resolveConflictKeep'] {
  return useCallback(() => {
    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyHint)
  }, [setters])
}

export function useResolveConflictSaveAsCopyAction({
  values,
  setters,
  openProject,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
}): ProjectEditorActions['resolveConflictSaveAsCopy'] {
  return useCallback(() => {
    if (!values.selectedPath || !values.rootPath) {
      return
    }

    const copyPath = buildConflictCopyPath(values.selectedPath, values.visibleFiles)
    void (async () => {
      const response = await window.tramaApi.saveDocument({
        path: copyPath,
        content: values.editorValue,
        meta: values.editorMeta,
      })

      if (!response.ok) {
        setters.setStatusMessage(`${PROJECT_EDITOR_STRINGS.statusSaveAsCopyFailed} ${response.error.message}`)
        return
      }

      setters.setExternalConflictPath(null)
      setters.setConflictComparisonContent(null)
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyCreated)
      await openProject(values.rootPath, response.data.path, values.workspaceLayout.activePane)
    })()
  }, [
    openProject,
    setters,
    values.editorMeta,
    values.editorValue,
    values.rootPath,
    values.selectedPath,
    values.visibleFiles,
    values.workspaceLayout.activePane,
  ])
}

export function useResolveConflictCompareAction({
  values,
  setters,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
}): ProjectEditorActions['resolveConflictCompare'] {
  return useCallback(() => {
    const conflictPath = values.externalConflictPath
    if (!conflictPath) {
      return
    }

    void (async () => {
      const response = await window.tramaApi.readDocument({ path: conflictPath })
      if (!response.ok) {
        setters.setStatusMessage(`${PROJECT_EDITOR_STRINGS.statusCompareFailed} ${response.error.message}`)
        return
      }

      setters.setConflictComparisonContent(response.data.content)
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusCompareReady)
    })()
  }, [setters, values.externalConflictPath])
}

export function useCloseConflictCompareAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['closeConflictCompare'] {
  return useCallback(() => {
    setters.setConflictComparisonContent(null)
  }, [setters])
}
