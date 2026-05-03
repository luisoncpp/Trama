import { useCallback } from 'preact/hooks'
import { canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions, ProjectEditorProjectState, WorkspaceLayoutState, WorkspacePane } from './project-editor-types'
import type { PaneWorkspace } from './pane'

function updatePathForPane(layout: WorkspaceLayoutState, pane: WorkspacePane, path: string): WorkspaceLayoutState {
  return pane === 'primary'
    ? { ...layout, primaryPath: path }
    : { ...layout, secondaryPath: path }
}

interface UseSetWorkspaceActivePaneActionParams {
  workspace: PaneWorkspace
  setters: {
    setWorkspaceLayout: (value: any) => void
    setConflictComparisonContent: (value: string | null) => void
    setStatusMessage: (value: string) => void
  }
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
}

export function useAssignFileToActivePaneAction(
  layout: WorkspaceLayoutState,
  setters: { setWorkspaceLayout: (value: any) => void },
): (filePath: string) => void {
  return useCallback(/* assignFileToActivePaneAction */ (filePath: string) => {
      setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => updatePathForPane(previous, layout.activePane, filePath))
    },
    [setters, layout.activePane] /*Inputs for assignFileToActivePaneAction*/)
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
  workspace,
  setters,
  loadDocument,
}: UseSetWorkspaceActivePaneActionParams): ProjectEditorActions['setWorkspaceActivePane'] {
  return useCallback(/* setWorkspaceActivePaneAction */ async (pane: WorkspacePane) => {
      const outgoingPane = workspace.layout.activePane
      const outgoingState = workspace.getPaneDocument(outgoingPane)
      if (outgoingState.isDirty && outgoingState.path) {
        await workspace.savePaneIfDirty(outgoingPane)
      }

      const nextPath = pane === 'secondary' ? workspace.layout.secondaryPath : workspace.layout.primaryPath

      setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
        ...previous,
        activePane: pane,
      }))

      if (!nextPath) {
        setters.setConflictComparisonContent(null)
        setters.setStatusMessage(PROJECT_EDITOR_STRINGS.noFileSelected)
        return
      }

      const targetPaneState = pane === 'secondary' ? workspace.secondary : workspace.primary
      if (targetPaneState.path !== nextPath) {
        void loadDocument(nextPath, pane)
      }
    },
    [
      loadDocument, setters,
      workspace,
    ] /*Inputs for setWorkspaceActivePaneAction*/)
}

interface UseOpenFileInPaneActionParams {
  workspace: PaneWorkspace
  setters: {
    setWorkspaceLayout: (value: any) => void
    setStatusMessage: (value: string) => void
  }
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
}

export function useOpenFileInPaneAction({
  workspace,
  setters,
  loadDocument,
}: UseOpenFileInPaneActionParams): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(/* openFileInPaneAction */ (filePath: string, pane: WorkspacePane) => {
      if (pane === 'secondary') {
        const shouldLoad = workspace.secondary.path !== filePath

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
        const primaryPaneState = workspace.primary
        const primaryPanePath = workspace.layout.primaryPath
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
    [loadDocument, setters, workspace] /*Inputs for openFileInPaneAction*/)
}
