import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import { canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

interface UseProjectEditorUiActionsParams {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  loadDocument: (path: string) => Promise<void>
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}

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
      setters.setStatusMessage(`No se pudo abrir el selector: ${selected.error.message}`)
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

function useUpdateEditorValueAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['updateEditorValue'] {
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

function useConflictActions({
  values,
  setters,
  loadDocument,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  loadDocument: (path: string) => Promise<void>
}): Pick<ProjectEditorActions, 'resolveConflictReload' | 'resolveConflictKeep'> {
  const resolveConflictReload = useCallback(() => {
    if (values.externalConflictPath) {
      void loadDocument(values.externalConflictPath)
    }

    setters.setExternalConflictPath(null)
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusReloadDiscarded)
  }, [loadDocument, setters, values.externalConflictPath])

  const resolveConflictKeep = useCallback(() => {
    setters.setExternalConflictPath(null)
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyHint)
  }, [setters])

  return {
    resolveConflictReload,
    resolveConflictKeep,
  }
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
  const updateEditorValue = useUpdateEditorValueAction(setters)
  const saveNow = useSaveNowAction({ values, saveDocumentNow })
  const { resolveConflictReload, resolveConflictKeep } = useConflictActions({
    values,
    setters,
    loadDocument,
  })

  return {
    pickProjectFolder,
    selectFile,
    updateEditorValue,
    saveNow,
    resolveConflictReload,
    resolveConflictKeep,
  }
}
