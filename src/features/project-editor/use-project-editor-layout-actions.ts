import { useCallback } from 'preact/hooks'
import { canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions, WorkspaceLayoutState, WorkspacePane } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'

function updatePathForPane(layout: WorkspaceLayoutState, pane: WorkspacePane, path: string): WorkspaceLayoutState {
  return pane === 'primary'
    ? { ...layout, primaryPath: path }
    : { ...layout, secondaryPath: path }
}

interface UseWorkspaceLayoutActionParams {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  panePersistence: ProjectEditorPanePersistence
}

interface UseSetWorkspaceActivePaneActionParams extends UseWorkspaceLayoutActionParams {
  panePersistence: ProjectEditorPanePersistence
}

export function useAssignFileToActivePaneAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): (filePath: string) => void {
  return useCallback(/* assignFileToActivePaneAction */ (filePath: string) => {
      setters.setWorkspaceLayout((previous) => updatePathForPane(previous, values.workspaceLayout.activePane, filePath))
    },
    [setters, values.workspaceLayout.activePane] /*Inputs for assignFileToActivePaneAction*/)
}

export function useAssignFileToPaneAction(
  setters: UseProjectEditorStateResult['setters'],
): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(/* assignFileToPaneAction */ (filePath: string, pane: WorkspacePane) => {
      setters.setWorkspaceLayout((previous) => updatePathForPane(previous, pane, filePath))
    },
    [setters] /*Inputs for assignFileToPaneAction*/)
}

export function useToggleWorkspaceLayoutModeAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['toggleWorkspaceLayoutMode'] {
  return useCallback(/* toggleWorkspaceLayoutModeAction */ () => {
    setters.setWorkspaceLayout((previous) => {
      if (previous.mode === 'single') {
        const secondaryPath = previous.secondaryPath ?? values.snapshot?.markdownFiles.find((path) => path !== previous.primaryPath) ?? null
        return {
          ...previous,
          mode: secondaryPath ? 'split' : 'single',
          secondaryPath,
          activePane: 'primary',
        }
      }

      return {
        ...previous,
        mode: 'single',
        activePane: 'primary',
      }
    })
  }, [setters, values.snapshot?.markdownFiles] /*Inputs for toggleWorkspaceLayoutModeAction*/)
}

export function useSetWorkspaceLayoutRatioAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['setWorkspaceLayoutRatio'] {
  return useCallback(/* setWorkspaceLayoutRatioAction */ (ratio: number) => {
      setters.setWorkspaceLayout((previous) => ({
        ...previous,
        ratio,
      }))
    },
    [setters] /*Inputs for setWorkspaceLayoutRatioAction*/)
}

export function useSetWorkspaceActivePaneAction({
  values,
  setters,
  loadDocument,
  panePersistence,
}: UseSetWorkspaceActivePaneActionParams): ProjectEditorActions['setWorkspaceActivePane'] {
  return useCallback(/* setWorkspaceActivePaneAction */ async (pane: WorkspacePane) => {
      const outgoingPane = values.workspaceLayout.activePane
      const outgoingState = panePersistence.getPaneStateForPane(outgoingPane)
      if (outgoingState.isDirty && outgoingState.path) {
        await panePersistence.savePaneIfDirty(outgoingPane)
      }

      const nextPath = pane === 'secondary' ? values.workspaceLayout.secondaryPath : values.workspaceLayout.primaryPath

      setters.setWorkspaceLayout((previous) => ({
        ...previous,
        activePane: pane,
      }))

      if (!nextPath) {
        setters.setConflictComparisonContent(null)
        setters.setStatusMessage(PROJECT_EDITOR_STRINGS.noFileSelected)
        return
      }

      const targetPaneState = pane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (targetPaneState.path !== nextPath) {
        void loadDocument(nextPath, pane)
      }
    },
    [
      loadDocument, panePersistence, setters,
      values.primaryPane, values.secondaryPane,
      values.workspaceLayout.activePane,
      values.workspaceLayout.primaryPath,
      values.workspaceLayout.secondaryPath,
    ] /*Inputs for setWorkspaceActivePaneAction*/)
}

export function useOpenFileInPaneAction({
  values,
  setters,
  loadDocument,
  panePersistence,
}: UseWorkspaceLayoutActionParams): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(/* openFileInPaneAction */ (filePath: string, pane: WorkspacePane) => {
      if (pane === 'secondary') {
        const shouldLoad = values.secondaryPane.path !== filePath

        setters.setWorkspaceLayout((previous) => ({
          ...previous,
          mode: previous.mode === 'single' ? 'split' : previous.mode,
          activePane: 'secondary',
          secondaryPath: filePath,
        }))

        if (shouldLoad) {
          void loadDocument(filePath, 'secondary')
        }
      } else {
        const primaryPaneState = panePersistence.getPaneStateForPane('primary')
        const primaryPanePath = values.workspaceLayout.primaryPath
        if (!canSelectFile(primaryPaneState.isDirty, primaryPanePath, filePath)) {
          setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
          return
        }

        setters.setWorkspaceLayout((previous) => ({
          ...previous,
          activePane: 'primary',
          primaryPath: filePath,
        }))

        if (primaryPanePath !== filePath) {
          void loadDocument(filePath, 'primary')
        }
      }
    },
    [loadDocument, panePersistence, setters, values.secondaryPane.path, values.primaryPane.path, values.workspaceLayout.primaryPath] /*Inputs for openFileInPaneAction*/)
}
