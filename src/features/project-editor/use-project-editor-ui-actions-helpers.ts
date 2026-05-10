import type { WorkspacePane } from './project-editor-types'
import type { PaneWorkspace } from './pane'
import {
  useMoveFileAction,
  useReorderFilesAction,
  useSelectFileAction,
  useRevertChangesAction,
} from './use-project-editor-ui-actions-helpers-core'
import { clampZoomLevel } from './editor-zoom'
import type {
  ProjectEditorLayoutState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
  WorkspaceLayoutState,
} from './project-editor-types'
import type { SidebarSection } from './project-editor-types'
import { useSetSidebarPanelWidthAction, useToggleSidebarPanelCollapsedAction } from './use-project-editor-sidebar-actions'
import { useSetFocusScopeAction, useSetFullscreenEnabledAction, useToggleFocusModeAction } from './use-project-editor-focus-actions'
import {
  useSetWorkspaceActivePaneAction,
  useSetWorkspaceLayoutRatioAction,
  useToggleWorkspaceLayoutModeAction,
} from './use-project-editor-layout-actions'
import { useProjectPickerActions } from './use-project-editor-picker-actions'

export { useProjectPickerActions }

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

export { useSelectFileAction, useReorderFilesAction, useMoveFileAction, useRevertChangesAction }

export function useSidebarActions(
  layout: WorkspaceLayoutState,
  sidebarState: ProjectEditorSidebarState,
  setters: UseProjectEditorUiActionsParams['setters'],
) {
  return {
    setSidebarSection: (section: SidebarSection) => {
      setters.setSidebarActiveSection(section)
      if (sidebarState.sidebarPanelCollapsed && !layout.focusModeEnabled) {
        setters.setSidebarPanelCollapsed(false)
      }
    },
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
    setZoomLevel: (level: number) => {
      setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
        ...previous,
        zoomLevel: clampZoomLevel(level),
      }))
    },
  }
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