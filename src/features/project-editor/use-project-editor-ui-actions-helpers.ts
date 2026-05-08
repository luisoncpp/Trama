import { useCallback } from 'preact/hooks'
import type { ProjectEditorActions } from './project-editor-types'
import type {
  ProjectEditorLayoutState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
  WorkspaceLayoutState,
} from './project-editor-types'
import type { SidebarSection } from './project-editor-types'
import type { WorkspacePane } from './project-editor-types'
import type { PaneWorkspace } from './pane'
import { useSetSidebarPanelWidthAction, useToggleSidebarPanelCollapsedAction } from './use-project-editor-sidebar-actions'
import { useSetFocusScopeAction, useSetFullscreenEnabledAction, useToggleFocusModeAction } from './use-project-editor-focus-actions'
import {
  useSetWorkspaceActivePaneAction,
  useSetWorkspaceLayoutRatioAction,
  useToggleWorkspaceLayoutModeAction,
} from './use-project-editor-layout-actions'
import { useProjectPickerActions } from './use-project-editor-picker-actions'

export interface UseProjectEditorUiActionsParams {
  layoutState: ProjectEditorLayoutState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: {
    setStatusMessage: (value: string) => void
    setWorkspaceLayout: (value: any) => void
    setSidebarPanelCollapsed: (value: boolean) => void
    setSidebarActiveSection: (value: SidebarSection) => void
    setSidebarPanelWidth: (value: number) => void
    setConflictComparisonContent: (value: string | null) => void
    setExternalConflictPath: (value: string | null) => void
    setIsFullscreen?: (value: boolean) => void
  }
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
}

export { useProjectPickerActions }

export function useSelectFileAction({
  workspace,
  loadDocument,
  assignFileToActivePane,
}: {
  workspace: PaneWorkspace
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  assignFileToActivePane: (filePath: string) => void
}): ProjectEditorActions['selectFile'] {
  return useCallback(/* selectFileAction */ async (filePath: string): Promise<void> => {
      const activePane = workspace.layout.activePane
      const activePaneState = workspace.getPaneDocument(activePane)
      await workspace.savePaneIfDirty(activePane)

      assignFileToActivePane(filePath)
      if (filePath !== activePaneState.path) {
        void loadDocument(filePath, activePane)
      }
    }, [
      assignFileToActivePane, loadDocument,
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
  layout: WorkspaceLayoutState,
  sidebarState: ProjectEditorSidebarState,
  setters: UseProjectEditorUiActionsParams['setters'],
) {
  return {
    setSidebarSection: useCallback(
      (section: SidebarSection) => {
        setters.setSidebarActiveSection(section)
        if (sidebarState.sidebarPanelCollapsed && !layout.focusModeEnabled) {
          setters.setSidebarPanelCollapsed(false)
        }
      },
      [setters, sidebarState.sidebarPanelCollapsed, layout.focusModeEnabled],
    ),
    toggleSidebarPanelCollapsed: useToggleSidebarPanelCollapsedAction(layout, sidebarState, setters),
    setSidebarPanelWidth: useSetSidebarPanelWidthAction(setters),
  }
}

export function useWorkspaceLayoutActions(
  workspace: PaneWorkspace,
  projectState: ProjectEditorProjectState,
  setters: UseProjectEditorUiActionsParams['setters'],
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>,
) {
  return {
    toggleWorkspaceLayoutMode: useToggleWorkspaceLayoutModeAction(projectState, setters),
    setWorkspaceLayoutRatio: useSetWorkspaceLayoutRatioAction(setters),
    setWorkspaceActivePane: useSetWorkspaceActivePaneAction({ workspace, setters, loadDocument }),
  }
}

export function useRevertChangesAction({
  workspace,
  loadDocument,
  setters,
  uiState,
}: {
  workspace: PaneWorkspace
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  setters: {
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
  }
  uiState: ProjectEditorUiState
}): ProjectEditorActions['revertChanges'] {
  return useCallback((pane?: WorkspacePane): void => {
    const targetPane = pane ?? workspace.layout.activePane
    const paneDocument = workspace.getPaneDocument(targetPane)
    if (!paneDocument.isDirty || !paneDocument.path) {
      return
    }
    if (paneDocument.path === uiState.externalConflictPath) {
      setters.setExternalConflictPath(null)
      setters.setConflictComparisonContent(null)
    }
    void loadDocument(paneDocument.path, targetPane)
  }, [workspace, loadDocument, setters, uiState.externalConflictPath])
}

export function useEditorViewActions(
  workspace: PaneWorkspace,
  uiState: ProjectEditorUiState,
  setters: UseProjectEditorUiActionsParams['setters'],
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>,
) {
  return {
    updateEditorValue: (nextValue: string, pane?: WorkspacePane) => {
      const targetPane = pane ?? workspace.layout.activePane
      workspace.updatePaneContent(targetPane, nextValue)
    },
    saveNow: async (pane?: WorkspacePane): Promise<void> => {
      const targetPane = pane ?? workspace.layout.activePane
      const paneStateLocal = workspace.getPaneDocument(targetPane)
      if (!paneStateLocal.path || uiState.saving || !paneStateLocal.isDirty) {
        return
      }
      await workspace.savePaneIfDirty(targetPane)
      if (paneStateLocal.path === uiState.externalConflictPath) {
        setters.setExternalConflictPath(null)
        setters.setConflictComparisonContent(null)
      }
    },
    revertChanges: useRevertChangesAction({ workspace, loadDocument, setters, uiState }),
    setFullscreenEnabled: useSetFullscreenEnabledAction(setters),
    toggleFocusMode: useToggleFocusModeAction(workspace.layout, setters),
    setFocusScope: useSetFocusScopeAction(setters),
  }
}