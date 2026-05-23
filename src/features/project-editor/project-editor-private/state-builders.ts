import { useMemo } from 'preact/hooks'
import type { PaneBindings } from '../pane'
import { deriveActivePaneDocument } from '../project-editor-logic'
import type { WorkspaceLayoutState } from '../project-editor-types'
import { useProjectEditorCoreState } from '../use-project-editor-core-state'
import { useSidebarUiState } from '../use-sidebar-ui-state'

function buildLayoutStateForMemo(workspaceLayout: WorkspaceLayoutState) {
  return { workspaceLayout }
}

function buildSidebarStateForMemo(
  sidebarUiState: ReturnType<typeof useSidebarUiState>,
  focusModeEnabled: boolean,
) {
  return {
    sidebarActiveSection: sidebarUiState.values.activeSection,
    sidebarPanelCollapsed: sidebarUiState.values.panelCollapsed,
    sidebarPanelWidth: sidebarUiState.values.panelWidth,
    focusModeEnabled,
  }
}

function buildProjectStateForMemo(
  coreState: ReturnType<typeof useProjectEditorCoreState>,
  visibleFiles: string[],
  corkboardOrder: Record<string, string[]>,
) {
  return {
    rootPath: coreState.rootPath,
    snapshot: coreState.snapshot,
    visibleFiles,
    corkboardOrder,
  }
}

function buildUiStateForMemo(
  coreState: ReturnType<typeof useProjectEditorCoreState>,
  apiAvailable: boolean,
) {
  return {
    apiAvailable,
    loadingProject: coreState.loadingProject,
    loadingDocument: coreState.loadingDocument,
    saving: coreState.saving,
    isFullscreen: coreState.isFullscreen,
    externalConflictPath: coreState.externalConflictPath,
    conflictComparisonContent: coreState.conflictComparisonContent,
    statusMessage: coreState.statusMessage,
  }
}

export function useProjectEditorSubStates(
  coreState: ReturnType<typeof useProjectEditorCoreState>,
  workspaceLayout: WorkspaceLayoutState,
  sidebarUiState: ReturnType<typeof useSidebarUiState>,
  apiAvailable: boolean,
  visibleFiles: string[],
  corkboardOrder: Record<string, string[]>,
) {
  const documentState = deriveActivePaneDocument(workspaceLayout, coreState.primaryPane, coreState.secondaryPane)
  const layoutState = useMemo(
    /* deriveLayoutState */ () => buildLayoutStateForMemo(workspaceLayout),
    [workspaceLayout] /*Inputs for deriveLayoutState*/,
  )
  const sidebarState = useMemo(
    /* deriveSidebarState */ () => buildSidebarStateForMemo(sidebarUiState, workspaceLayout.focusModeEnabled),
    [
      sidebarUiState.values.activeSection,
      sidebarUiState.values.panelCollapsed,
      sidebarUiState.values.panelWidth,
      workspaceLayout.focusModeEnabled,
    ] /*Inputs for deriveSidebarState*/,
  )
  const projectState = useMemo(
    /* deriveProjectState */ () => buildProjectStateForMemo(coreState, visibleFiles, corkboardOrder),
    [coreState.rootPath, coreState.snapshot, visibleFiles, corkboardOrder] /*Inputs for deriveProjectState*/,
  )
  const uiState = useMemo(
    /* deriveUiState */ () => buildUiStateForMemo(coreState, apiAvailable),
    [
      apiAvailable,
      coreState.loadingProject,
      coreState.loadingDocument,
      coreState.saving,
      coreState.isFullscreen,
      coreState.externalConflictPath,
      coreState.conflictComparisonContent,
      coreState.statusMessage,
    ] /*Inputs for deriveUiState*/,
  )

  return { documentState, layoutState, sidebarState, projectState, uiState }
}

export interface ProjectEditorSetters {
  setRootPath: (value: string) => void
  setSnapshot: (value: import('../../../shared/ipc').ProjectSnapshot | null) => void
  setLoadingProject: (value: boolean) => void
  setLoadingDocument: (value: boolean) => void
  setSaving: (value: boolean) => void
  setIsFullscreen: (value: boolean) => void
  setExternalConflictPath: (value: string | null) => void
  setConflictComparisonContent: (value: string | null) => void
  setStatusMessage: (value: string) => void
  setSidebarActiveSection: (value: import('../project-editor-types').SidebarSection) => void
  setSidebarPanelCollapsed: (value: boolean) => void
  setSidebarPanelWidth: (value: number) => void
  setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void
}

function buildSettersForMemo(
  coreState: ReturnType<typeof useProjectEditorCoreState>,
  sidebarUiState: ReturnType<typeof useSidebarUiState>,
  setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void,
) {
  return {
    setRootPath: coreState.setRootPath,
    setSnapshot: coreState.setSnapshot,
    setLoadingProject: coreState.setLoadingProject,
    setLoadingDocument: coreState.setLoadingDocument,
    setSaving: coreState.setSaving,
    setIsFullscreen: coreState.setIsFullscreen,
    setExternalConflictPath: coreState.setExternalConflictPath,
    setConflictComparisonContent: coreState.setConflictComparisonContent,
    setStatusMessage: coreState.setStatusMessage,
    setSidebarActiveSection: sidebarUiState.setters.setActiveSection,
    setSidebarPanelCollapsed: sidebarUiState.setters.setPanelCollapsed,
    setSidebarPanelWidth: sidebarUiState.setters.setPanelWidth,
    setWorkspaceLayout,
  }
}

function buildPaneBindingsForMemo(coreState: ReturnType<typeof useProjectEditorCoreState>): PaneBindings {
  return {
    primaryPane: coreState.primaryPane,
    secondaryPane: coreState.secondaryPane,
    setPrimaryPane: coreState.setPrimaryPane,
    setSecondaryPane: coreState.setSecondaryPane,
  }
}

export function useProjectEditorBindings(
  coreState: ReturnType<typeof useProjectEditorCoreState>,
  sidebarUiState: ReturnType<typeof useSidebarUiState>,
  setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void,
): { setters: ProjectEditorSetters; paneBindings: PaneBindings } {
  const setters = useMemo(
    /* buildProjectEditorSetters */ () => buildSettersForMemo(coreState, sidebarUiState, setWorkspaceLayout),
    [
      coreState.setRootPath, coreState.setSnapshot, coreState.setLoadingProject,
      coreState.setLoadingDocument, coreState.setSaving, coreState.setIsFullscreen,
      coreState.setExternalConflictPath, coreState.setConflictComparisonContent,
      coreState.setStatusMessage, sidebarUiState.setters.setActiveSection,
      sidebarUiState.setters.setPanelCollapsed, sidebarUiState.setters.setPanelWidth,
      setWorkspaceLayout,
    ] /*Inputs for buildProjectEditorSetters*/,
  )
  const paneBindings = useMemo<PaneBindings>(
    /* buildPaneBindings */ () => buildPaneBindingsForMemo(coreState),
    [
      coreState.primaryPane, coreState.secondaryPane,
      coreState.setPrimaryPane, coreState.setSecondaryPane,
    ] /*Inputs for buildPaneBindings*/,
  )
  return { setters, paneBindings }
}
