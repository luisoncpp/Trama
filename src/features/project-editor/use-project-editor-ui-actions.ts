import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import { buildConflictCopyPath, canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions } from './project-editor-types'
import { useSetSidebarPanelWidthAction, useSetSidebarSectionAction, useToggleSidebarPanelCollapsedAction } from './use-project-editor-sidebar-actions'
import { useProjectEditorCreateActions } from './use-project-editor-create-actions'
import { useProjectEditorFileActions } from './use-project-editor-file-actions'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

interface UseProjectEditorUiActionsParams { values: UseProjectEditorStateResult['values']; setters: UseProjectEditorStateResult['setters']; openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>; loadDocument: (path: string) => Promise<void>; saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void> }
function usePickProjectFolderAction({
  openProject,
  setters,
}: {
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setters: UseProjectEditorStateResult['setters']
}): ProjectEditorActions['pickProjectFolder'] {
  return useCallback(async (): Promise<void> => {
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
  }, [openProject, setters])
}
function useSelectFileAction({
  values,
  setters,
  loadDocument,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  loadDocument: (path: string) => Promise<void>
}): ProjectEditorActions['selectFile'] {
  return useCallback(
    (filePath: string) => {
      if (!canSelectFile(values.isDirty, values.selectedPath, filePath)) {
        setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
        return
      }

      void loadDocument(filePath)
    },
    [loadDocument, setters, values.isDirty, values.selectedPath],
  )
}
function useUpdateEditorValueAction(setters: UseProjectEditorStateResult['setters']): ProjectEditorActions['updateEditorValue'] {
  return useCallback(
    (nextValue: string) => {
      setters.setEditorValue(nextValue)
      setters.setIsDirty(true)
    },
    [setters],
  )
}
function useSaveNowAction({
  values,
  saveDocumentNow,
}: {
  values: UseProjectEditorStateResult['values']
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}): ProjectEditorActions['saveNow'] {
  return useCallback(() => {
    if (!values.selectedPath || values.saving || !values.isDirty) {
      return
    }

    void saveDocumentNow(values.selectedPath, values.editorValue, values.editorMeta)
  }, [saveDocumentNow, values.editorMeta, values.editorValue, values.isDirty, values.saving, values.selectedPath])
}
function useResolveConflictReloadAction({
  values,
  setters,
  loadDocument,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  loadDocument: (path: string) => Promise<void>
}): ProjectEditorActions['resolveConflictReload'] {
  return useCallback(() => {
    if (values.externalConflictPath) {
      void loadDocument(values.externalConflictPath)
    }

    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusReloadDiscarded)
  }, [loadDocument, setters, values.externalConflictPath])
}
function useResolveConflictKeepAction(setters: UseProjectEditorStateResult['setters']): ProjectEditorActions['resolveConflictKeep'] {
  return useCallback(() => {
    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyHint)
  }, [setters])
}
function useResolveConflictSaveAsCopyAction({
  values,
  setters,
  openProject,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
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
      await openProject(values.rootPath, response.data.path)
    })()
  }, [openProject, setters, values.editorMeta, values.editorValue, values.rootPath, values.selectedPath, values.visibleFiles])
}
function useResolveConflictCompareAction({
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
function useCloseConflictCompareAction(setters: UseProjectEditorStateResult['setters']): ProjectEditorActions['closeConflictCompare'] {
  return useCallback(() => {
    setters.setConflictComparisonContent(null)
  }, [setters])
}

export function useProjectEditorUiActions({
  values,
  setters,
  openProject,
  loadDocument,
  saveDocumentNow,
}: UseProjectEditorUiActionsParams): ProjectEditorActions {
  const pickProjectFolder = usePickProjectFolderAction({ openProject, setters })
  const selectFile = useSelectFileAction({ values, setters, loadDocument })
  const { createArticle, createCategory } = useProjectEditorCreateActions({ values, setters, openProject })
  const { renameFile, deleteFile } = useProjectEditorFileActions({ values, setters, openProject })
  const setSidebarSection = useSetSidebarSectionAction(setters)
  const toggleSidebarPanelCollapsed = useToggleSidebarPanelCollapsedAction(values, setters)
  const setSidebarPanelWidth = useSetSidebarPanelWidthAction(setters)
  const updateEditorValue = useUpdateEditorValueAction(setters)
  const saveNow = useSaveNowAction({ values, saveDocumentNow })
  const resolveConflictReload = useResolveConflictReloadAction({ values, setters, loadDocument })
  const resolveConflictKeep = useResolveConflictKeepAction(setters)
  const resolveConflictSaveAsCopy = useResolveConflictSaveAsCopyAction({ values, setters, openProject })
  const resolveConflictCompare = useResolveConflictCompareAction({ values, setters })
  const closeConflictCompare = useCloseConflictCompareAction(setters)

  return {
    pickProjectFolder,
    selectFile,
    createArticle,
    createCategory,
    renameFile,
    deleteFile,
    setSidebarSection,
    toggleSidebarPanelCollapsed,
    setSidebarPanelWidth,
    updateEditorValue,
    saveNow,
    resolveConflictReload,
    resolveConflictKeep,
    resolveConflictSaveAsCopy,
    resolveConflictCompare,
    closeConflictCompare,
  }
}
