import { useMemo } from 'preact/hooks'
import type { WorkspaceLayoutState, ProjectEditorStateValues } from './project-editor-types'
import type { ProjectSnapshot } from '../../shared/ipc'
import { useSidebarUiState } from './use-sidebar-ui-state'
import { useWorkspaceLayoutState } from './use-workspace-layout-state'
import { useProjectEditorCoreState } from './use-project-editor-core-state'
import { useProjectEditorSubStates } from './use-project-editor-sub-states'
import { useProjectEditorSetters, usePaneBindings } from './use-project-editor-state-hooks'

export type {
  ProjectEditorDocumentState,
  ProjectEditorLayoutState,
  ProjectEditorPaneState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
} from './project-editor-types'
export { type ProjectEditorStateValues }

import type { PaneBindings } from './pane'

export interface ProjectEditorStateSetters {
  setRootPath: (value: string) => void
  setSnapshot: (value: ProjectSnapshot | null) => void
  setLoadingProject: (value: boolean) => void
  setLoadingDocument: (value: boolean) => void
  setSaving: (value: boolean) => void
  setIsFullscreen: (value: boolean) => void
  setExternalConflictPath: (value: string | null) => void
  setConflictComparisonContent: (value: string | null) => void
  setStatusMessage: (value: string) => void
  setSidebarActiveSection: (value: import('./project-editor-types').SidebarSection) => void
  setSidebarPanelCollapsed: (value: boolean) => void
  setSidebarPanelWidth: (value: number) => void
  setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void
}

export interface UseProjectEditorStateResult {
  values: import('./project-editor-types').ProjectEditorStateValues
  documentState: import('./project-editor-types').ProjectEditorDocumentState
  layoutState: import('./project-editor-types').ProjectEditorLayoutState
  sidebarState: import('./project-editor-types').ProjectEditorSidebarState
  projectState: import('./project-editor-types').ProjectEditorProjectState
  uiState: import('./project-editor-types').ProjectEditorUiState
  setters: ProjectEditorStateSetters
  paneBindings: PaneBindings
}

export function useProjectEditorState(): UseProjectEditorStateResult {
  const coreState = useProjectEditorCoreState()
  const [workspaceLayout, setWorkspaceLayout] = useWorkspaceLayoutState()
  const sidebarUiState = useSidebarUiState()

  const {
    rootPath, snapshot, primaryPane, secondaryPane,
    loadingProject, loadingDocument, saving, isFullscreen,
    externalConflictPath, conflictComparisonContent, statusMessage,
    setRootPath, setSnapshot, setLoadingProject, setLoadingDocument,
    setSaving, setIsFullscreen, setExternalConflictPath,
    setConflictComparisonContent, setStatusMessage,
    setPrimaryPane, setSecondaryPane,
  } = coreState

  const sidebarSnapshot = {
    activeSection: sidebarUiState.values.activeSection,
    panelCollapsed: sidebarUiState.values.panelCollapsed,
    panelWidth: sidebarUiState.values.panelWidth,
  }

  const coreSnapshot = {
    rootPath, snapshot, primaryPane, secondaryPane,
    loadingProject, loadingDocument, saving, isFullscreen,
    externalConflictPath, conflictComparisonContent, statusMessage,
  }

  const { documentState, layoutState, sidebarState, projectState, uiState, values } =
    useProjectEditorSubStates(coreSnapshot, workspaceLayout, sidebarSnapshot)

  const setters = useProjectEditorSetters({
    setRootPath, setSnapshot, setLoadingProject, setLoadingDocument,
    setSaving, setIsFullscreen, setExternalConflictPath,
    setConflictComparisonContent, setStatusMessage,
    setSidebarActiveSection: sidebarUiState.setters.setActiveSection,
    setSidebarPanelCollapsed: sidebarUiState.setters.setPanelCollapsed,
    setSidebarPanelWidth: sidebarUiState.setters.setPanelWidth,
    setWorkspaceLayout,
  })

  const paneBindings = usePaneBindings(primaryPane, secondaryPane, setPrimaryPane, setSecondaryPane)

  return { values, documentState, layoutState, sidebarState, projectState, uiState, setters, paneBindings }
}
