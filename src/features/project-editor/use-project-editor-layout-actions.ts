import { useCallback } from 'preact/hooks'
import { canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions, ProjectEditorLayoutState, ProjectEditorPaneState, ProjectEditorProjectState, WorkspaceLayoutState, WorkspacePane } from './project-editor-types'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'

function updatePathForPane(layout: WorkspaceLayoutState, pane: WorkspacePane, path: string): WorkspaceLayoutState {
  return pane === 'primary'
    ? { ...layout, primaryPath: path }
    : { ...layout, secondaryPath: path }
}

interface UseWorkspaceLayoutActionParams {
  layoutState: ProjectEditorLayoutState
  paneState: ProjectEditorPaneState
  projectState: ProjectEditorProjectState
  setters: {
    setWorkspaceLayout: (value: any) => void
    setConflictComparisonContent: (value: string | null) => void
    setStatusMessage: (value: string) => void
  }
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  panePersistence: ProjectEditorPanePersistence
}

interface UseSetWorkspaceActivePaneActionParams extends UseWorkspaceLayoutActionParams {
  panePersistence: ProjectEditorPanePersistence
}

export function useAssignFileToActivePaneAction(
  layoutState: ProjectEditorLayoutState,
  setters: { setWorkspaceLayout: (value: any) => void },
): (filePath: string) => void {
  return useCallback(/* assignFileToActivePaneAction */ (filePath: string) => {
      setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => updatePathForPane(previous, layoutState.workspaceLayout.activePane, filePath))
    },
    [setters, layoutState.workspaceLayout.activePane] /*Inputs for assignFileToActivePaneAction*/)
}

export function useAssignFileToPaneAction(
  setters: { setWorkspaceLayout: (value: any) => void },
): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(/* assignFileToPaneAction */ (filePath: string, pane: WorkspacePane) => {
      setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => updatePathForPane(previous, pane, filePath))
    },
    [setters] /*Inputs for assignFileToPaneAction*/)
}

export function useToggleWorkspaceLayoutModeAction(
  layoutState: ProjectEditorLayoutState,
  projectState: ProjectEditorProjectState,
  setters: { setWorkspaceLayout: (value: any) => void },
): ProjectEditorActions['toggleWorkspaceLayoutMode'] {
  return useCallback(/* toggleWorkspaceLayoutModeAction */ () => {
    setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => {
      if (previous.mode === 'single') {
        const secondaryPath = previous.secondaryPath ?? projectState.snapshot?.markdownFiles.find((path) => path !== previous.primaryPath) ?? null
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
  }, [setters, projectState.snapshot?.markdownFiles] /*Inputs for toggleWorkspaceLayoutModeAction*/)
}

export function useSetWorkspaceLayoutRatioAction(
  setters: { setWorkspaceLayout: (value: any) => void },
): ProjectEditorActions['setWorkspaceLayoutRatio'] {
  return useCallback(/* setWorkspaceLayoutRatioAction */ (ratio: number) => {
      setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
        ...previous,
        ratio,
      }))
    },
    [setters] /*Inputs for setWorkspaceLayoutRatioAction*/)
}

export function useSetWorkspaceActivePaneAction({
  layoutState,
  paneState,
  setters,
  loadDocument,
  panePersistence,
}: UseSetWorkspaceActivePaneActionParams): ProjectEditorActions['setWorkspaceActivePane'] {
  return useCallback(/* setWorkspaceActivePaneAction */ async (pane: WorkspacePane) => {
      const outgoingPane = layoutState.workspaceLayout.activePane
      const outgoingState = panePersistence.getPaneStateForPane(outgoingPane)
      if (outgoingState.isDirty && outgoingState.path) {
        await panePersistence.savePaneIfDirty(outgoingPane)
      }

      const nextPath = pane === 'secondary' ? layoutState.workspaceLayout.secondaryPath : layoutState.workspaceLayout.primaryPath

      setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
        ...previous,
        activePane: pane,
      }))

      if (!nextPath) {
        setters.setConflictComparisonContent(null)
        setters.setStatusMessage(PROJECT_EDITOR_STRINGS.noFileSelected)
        return
      }

      const targetPaneState = pane === 'secondary' ? paneState.secondaryPane : paneState.primaryPane
      if (targetPaneState.path !== nextPath) {
        void loadDocument(nextPath, pane)
      }
    },
    [
      loadDocument, panePersistence, setters,
      paneState.primaryPane, paneState.secondaryPane,
      layoutState.workspaceLayout.activePane,
      layoutState.workspaceLayout.primaryPath,
      layoutState.workspaceLayout.secondaryPath,
    ] /*Inputs for setWorkspaceActivePaneAction*/)
}

export function useOpenFileInPaneAction({
  layoutState,
  paneState,
  setters,
  loadDocument,
  panePersistence,
}: UseWorkspaceLayoutActionParams): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(/* openFileInPaneAction */ (filePath: string, pane: WorkspacePane) => {
      if (pane === 'secondary') {
        const shouldLoad = paneState.secondaryPane.path !== filePath

        setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
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
        const primaryPanePath = layoutState.workspaceLayout.primaryPath
        if (!canSelectFile(primaryPaneState.isDirty, primaryPanePath, filePath)) {
          setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
          return
        }

        setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
          ...previous,
          activePane: 'primary',
          primaryPath: filePath,
        }))

        if (primaryPanePath !== filePath) {
          void loadDocument(filePath, 'primary')
        }
      }
    },
    [loadDocument, panePersistence, setters, paneState.secondaryPane.path, paneState.primaryPane.path, layoutState.workspaceLayout.primaryPath] /*Inputs for openFileInPaneAction*/)
}
