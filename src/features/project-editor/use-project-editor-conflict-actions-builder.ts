import type { ProjectEditorActions } from './project-editor-types'
import type { PaneWorkspace } from './pane'
import * as conflictActions from './conflict-actions'
import type { BuildActionsInput } from './use-project-editor-actions-types'

export function buildConflictActions(input: BuildActionsInput): Pick<ProjectEditorActions,
  | 'resolveConflictReload' | 'resolveConflictKeep' | 'resolveConflictSaveAsCopy'
  | 'resolveConflictCompare' | 'closeConflictCompare'
> {
  const { projectState, uiState, setters, paneWorkspace, loadDocument, openProject } = input
  return {
    resolveConflictReload: () =>
      conflictActions.resolveConflictReload({
        workspace: paneWorkspace, uiState,
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        setStatusMessage: setters.setStatusMessage, loadDocument,
      }),
    resolveConflictKeep: () =>
      conflictActions.resolveConflictKeep({
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        setStatusMessage: setters.setStatusMessage,
      }),
    resolveConflictSaveAsCopy: () => {
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
    },
    resolveConflictCompare: () =>
      conflictActions.resolveConflictCompare({
        uiState, setStatusMessage: setters.setStatusMessage,
        setConflictComparisonContent: setters.setConflictComparisonContent,
      }),
    closeConflictCompare: () =>
      conflictActions.closeConflictCompare({
        setConflictComparisonContent: setters.setConflictComparisonContent,
      }),
  }
}
