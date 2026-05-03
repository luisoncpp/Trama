import { useCallback } from 'preact/hooks'
import type { ProjectEditorActions } from './project-editor-types'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'
import type {
  ProjectEditorLayoutState,
  ProjectEditorPaneState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
} from './project-editor-types'
import type { SidebarSection } from './project-editor-types'
import type { WorkspacePane } from './project-editor-types'
import type { PaneWorkspace } from './pane-workspace'
import { useSetSidebarPanelWidthAction, useSetSidebarSectionAction, useToggleSidebarPanelCollapsedAction } from './use-project-editor-sidebar-actions'
import { useSetFocusScopeAction, useSetFullscreenEnabledAction, useToggleFocusModeAction } from './use-project-editor-focus-actions'
import {
  useSetWorkspaceActivePaneAction,
  useSetWorkspaceLayoutRatioAction,
  useToggleWorkspaceLayoutModeAction,
} from './use-project-editor-layout-actions'
import { useProjectPickerActions } from './use-project-editor-picker-actions'

export interface UseProjectEditorUiActionsParams {
  layoutState: ProjectEditorLayoutState
  paneState: ProjectEditorPaneState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: {
    setStatusMessage: (value: string) => void
    setWorkspaceLayout: (value: any) => void
    setSidebarPanelCollapsed: (value: boolean) => void
    setSidebarActiveSection: (value: SidebarSection) => void
    setSidebarPanelWidth: (value: number) => void
    setSecondaryPane: (value: any) => void
    setPrimaryPane: (value: any) => void
    setConflictComparisonContent: (value: string | null) => void
    setExternalConflictPath: (value: string | null) => void
    setIsFullscreen?: (value: boolean) => void
  }
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  panePersistence: ProjectEditorPanePersistence
}

export { useProjectPickerActions }

export function useSelectFileAction({
  workspace,
  loadDocument,
  assignFileToActivePane,
  panePersistence,
}: {
  workspace: PaneWorkspace
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  assignFileToActivePane: (filePath: string) => void
  panePersistence: ProjectEditorPanePersistence
}): ProjectEditorActions['selectFile'] {
  return useCallback(/* selectFileAction */ async (filePath: string): Promise<void> => {
      const activePane = workspace.layout.activePane
      const activePaneState = panePersistence.getPaneStateForPane(activePane)
      await panePersistence.savePaneIfDirty(activePane)

      assignFileToActivePane(filePath)
      if (filePath !== activePaneState.path) {
        void loadDocument(filePath, activePane)
      }
    }, [
      assignFileToActivePane, loadDocument, panePersistence,
      workspace,
    ] /*Inputs for selectFileAction*/)
}

export function useReorderFilesAction({
  setters,
  openProject,
  rootPath,
}: {
  setters: UseProjectEditorUiActionsParams['setters']
  openProject: (projectRoot: string) => Promise<void>
  rootPath: string
}): ProjectEditorActions['reorderFiles'] {
  return useCallback(/* reorderFilesAction */ async (folderPath: string, orderedIds: string[]): Promise<void> => {
      try {
        const response = await window.tramaApi.reorderFiles({ folderPath, orderedIds })
        if (!response.ok) {
          setters.setStatusMessage(`Could not reorder files: ${response.error.message}`)
          return
        }
        setters.setStatusMessage(`File order updated for folder: ${folderPath || '(root)'}`)
        await openProject(rootPath)
      } catch (error) {
        setters.setStatusMessage(`Error reordering files: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [openProject, rootPath, setters] /*Inputs for reorderFilesAction*/)
}

export function useMoveFileAction({
  workspace,
  projectState,
  setters,
  openProject,
}: {
  workspace: PaneWorkspace
  projectState: ProjectEditorProjectState
  setters: UseProjectEditorUiActionsParams['setters']
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
}): ProjectEditorActions['moveFile'] {
  return useCallback(/* moveFileAction */ async (sourcePath: string, targetFolder: string): Promise<void> => {
      if (!projectState.rootPath) {
        setters.setStatusMessage('No project is open')
        return
      }

      const isSourceDirty =
        (workspace.primary.path === sourcePath && workspace.primary.isDirty) ||
        (workspace.secondary.path === sourcePath && workspace.secondary.isDirty)
      if (isSourceDirty) {
        setters.setStatusMessage('Save the file before moving it.')
        return
      }

      try {
        const response = await window.tramaApi.moveFile({ sourcePath, targetFolder })
        if (!response.ok) {
          setters.setStatusMessage(`Could not move file: ${response.error.message}`)
          return
        }

        setters.setStatusMessage(`Moved file to: ${response.data.renamedTo}`)
        await openProject(projectState.rootPath, response.data.renamedTo)
      } catch (error) {
        setters.setStatusMessage(`Error moving file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [openProject, setters, workspace, projectState.rootPath] /*Inputs for moveFileAction*/)
}

export function useSidebarActions(
  layoutState: ProjectEditorLayoutState,
  sidebarState: ProjectEditorSidebarState,
  setters: UseProjectEditorUiActionsParams['setters'],
) {
  return {
    setSidebarSection: useSetSidebarSectionAction(setters),
    toggleSidebarPanelCollapsed: useToggleSidebarPanelCollapsedAction(layoutState, sidebarState, setters),
    setSidebarPanelWidth: useSetSidebarPanelWidthAction(setters),
  }
}

export function useWorkspaceLayoutActions(
  workspace: PaneWorkspace,
  projectState: ProjectEditorProjectState,
  setters: UseProjectEditorUiActionsParams['setters'],
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>,
  panePersistence: ProjectEditorPanePersistence,
) {
  return {
    toggleWorkspaceLayoutMode: useToggleWorkspaceLayoutModeAction(projectState, setters),
    setWorkspaceLayoutRatio: useSetWorkspaceLayoutRatioAction(setters),
    setWorkspaceActivePane: useSetWorkspaceActivePaneAction({ workspace, setters, loadDocument, panePersistence }),
  }
}

export function useEditorViewActions(
  workspace: PaneWorkspace,
  uiState: ProjectEditorUiState,
  setters: UseProjectEditorUiActionsParams['setters'],
  panePersistence: ProjectEditorPanePersistence,
) {
  return {
    updateEditorValue: (nextValue: string, pane?: WorkspacePane) => {
      const targetPane = pane ?? workspace.layout.activePane
      if (targetPane === 'secondary') {
        setters.setSecondaryPane((prev: any) => ({ ...prev, content: nextValue, isDirty: true }))
      } else {
        setters.setPrimaryPane((prev: any) => ({ ...prev, content: nextValue, isDirty: true }))
      }
    },
    saveNow: (pane?: WorkspacePane) => {
      const targetPane = pane ?? workspace.layout.activePane
      const paneStateLocal = panePersistence.getPaneStateForPane(targetPane)
      if (!paneStateLocal.path || uiState.saving || !paneStateLocal.isDirty) {
        return
      }
      void panePersistence.savePaneIfDirty(targetPane)
    },
    setFullscreenEnabled: useSetFullscreenEnabledAction(setters),
    toggleFocusMode: useToggleFocusModeAction(workspace.layout, setters),
    setFocusScope: useSetFocusScopeAction(setters),
  }
}
