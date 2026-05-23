import type { ProjectEditorActions } from '../project-editor-types'
import * as conflictActions from '../conflict-actions'
import type { ActionGroupParams } from './action-group-types'

function buildSaveAsCopyAction({ projectState, setters, paneWorkspace, openProject }: ActionGroupParams) {
  return () => {
    const activeDoc = paneWorkspace.getActivePaneDocument()
    return conflictActions.resolveConflictSaveAsCopy({
      documentState: {
        selectedPath: activeDoc.selectedPath,
        editorValue: activeDoc.editorValue,
        editorMeta: activeDoc.editorMeta,
        isDirty: activeDoc.isDirty,
      },
      projectState,
      setStatusMessage: setters.setStatusMessage,
      setExternalConflictPath: setters.setExternalConflictPath,
      setConflictComparisonContent: setters.setConflictComparisonContent,
      openProject,
      workspace: paneWorkspace,
    })
  }
}

export function buildConflictActionGroup({
  uiState,
  setters,
  paneWorkspace,
  loadDocument,
  openProject,
  projectState,
}: ActionGroupParams): Pick<ProjectEditorActions,
  | 'resolveConflictReload'
  | 'resolveConflictKeep'
  | 'resolveConflictSaveAsCopy'
  | 'resolveConflictCompare'
  | 'closeConflictCompare'
> {
  return {
    resolveConflictReload: () => conflictActions.resolveConflictReload({
      workspace: paneWorkspace,
      uiState,
      setExternalConflictPath: setters.setExternalConflictPath,
      setConflictComparisonContent: setters.setConflictComparisonContent,
      setStatusMessage: setters.setStatusMessage,
      loadDocument,
    }),
    resolveConflictKeep: () => conflictActions.resolveConflictKeep({
      setExternalConflictPath: setters.setExternalConflictPath,
      setConflictComparisonContent: setters.setConflictComparisonContent,
      setStatusMessage: setters.setStatusMessage,
    }),
    resolveConflictSaveAsCopy: buildSaveAsCopyAction({ projectState, uiState, setters, paneWorkspace, loadDocument, openProject } as ActionGroupParams),
    resolveConflictCompare: () => conflictActions.resolveConflictCompare({
      uiState,
      setStatusMessage: setters.setStatusMessage,
      setConflictComparisonContent: setters.setConflictComparisonContent,
    }),
    closeConflictCompare: () => conflictActions.closeConflictCompare({
      setConflictComparisonContent: setters.setConflictComparisonContent,
    }),
  }
}
