import type { ProjectEditorModel } from './project-editor-types'
import { useProjectEditorActions } from './use-project-editor-actions'
import { useProjectEditorAutosaveEffect } from './use-project-editor-autosave-effect'
import { useProjectEditorExternalEventsEffect } from './use-project-editor-external-events-effect'
import { useProjectEditorState } from './use-project-editor-state'

export function useProjectEditor(): ProjectEditorModel {
  const state = useProjectEditorState()
  const { values, setters } = state
  const { actions, core } = useProjectEditorActions(state)

  useProjectEditorAutosaveEffect({
    selectedPath: values.selectedPath,
    isDirty: values.isDirty,
    editorValue: values.editorValue,
    editorMeta: values.editorMeta,
    saveDocumentNow: core.saveDocumentNow,
  })

  useProjectEditorExternalEventsEffect({
    snapshotRootPath: values.snapshot?.rootPath ?? null,
    selectedPath: values.selectedPath,
    isDirty: values.isDirty,
    clearEditor: core.clearEditor,
    loadDocument: core.loadDocument,
    openProject: core.openProject,
    setExternalConflictPath: setters.setExternalConflictPath,
    setStatusMessage: setters.setStatusMessage,
  })

  return {
    state: {
      apiAvailable: values.apiAvailable,
      rootPath: values.rootPath,
      statusMessage: values.statusMessage,
      externalConflictPath: values.externalConflictPath,
      visibleFiles: values.visibleFiles,
      selectedPath: values.selectedPath,
      editorValue: values.editorValue,
      isDirty: values.isDirty,
      loadingProject: values.loadingProject,
      loadingDocument: values.loadingDocument,
      saving: values.saving,
    },
    actions,
  }
}
