import { useMemo } from 'preact/hooks'
import type { PaneDocumentState, ProjectEditorStateValues, SidebarSection, WorkspaceLayoutState } from './project-editor-types'
import type { ProjectSnapshot } from '../../shared/ipc'
import { useSidebarUiState } from './use-sidebar-ui-state'
import { useWorkspaceLayoutState } from './use-workspace-layout-state'
import { useProjectEditorCoreState } from './use-project-editor-core-state'
import {
  useDocumentState,
  usePaneState,
  useLayoutState,
  useSidebarSt,
  useProjectSt,
  useUiSt,
  getVisibleSidebarPaths,
} from './use-project-editor-sub-state-hooks'

export type {
  ProjectEditorDocumentState,
  ProjectEditorLayoutState,
  ProjectEditorPaneState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
} from './project-editor-types'
export { type ProjectEditorStateValues }

export interface ProjectEditorStateSetters {
  setRootPath: (value: string) => void
  setSnapshot: (value: ProjectSnapshot | null) => void
  setPrimaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
  setSecondaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
  setLoadingProject: (value: boolean) => void
  setLoadingDocument: (value: boolean) => void
  setSaving: (value: boolean) => void
  setIsFullscreen: (value: boolean) => void
  setExternalConflictPath: (value: string | null) => void
  setConflictComparisonContent: (value: string | null) => void
  setStatusMessage: (value: string) => void
  setSidebarActiveSection: (value: SidebarSection) => void
  setSidebarPanelCollapsed: (value: boolean) => void
  setSidebarPanelWidth: (value: number) => void
  setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void
}

export interface UseProjectEditorStateResult {
  values: ProjectEditorStateValues
  documentState: import('./project-editor-types').ProjectEditorDocumentState
  paneState: import('./project-editor-types').ProjectEditorPaneState
  layoutState: import('./project-editor-types').ProjectEditorLayoutState
  sidebarState: import('./project-editor-types').ProjectEditorSidebarState
  projectState: import('./project-editor-types').ProjectEditorProjectState
  uiState: import('./project-editor-types').ProjectEditorUiState
  setters: ProjectEditorStateSetters
}

function buildValues(
  apiAvailable: boolean,
  coreState: ReturnType<typeof useProjectEditorCoreState>,
  workspaceLayout: WorkspaceLayoutState,
  sidebarUiState: ReturnType<typeof useSidebarUiState>,
  visibleFiles: string[],
  corkboardOrder: Record<string, string[]>,
): ProjectEditorStateValues {
  const activePane = workspaceLayout.activePane === 'secondary'
    ? coreState.secondaryPane
    : coreState.primaryPane
  const activePanePath = workspaceLayout.activePane === 'secondary'
    ? workspaceLayout.secondaryPath
    : workspaceLayout.primaryPath
  return {
    apiAvailable,
    rootPath: coreState.rootPath,
    snapshot: coreState.snapshot,
    primaryPane: coreState.primaryPane,
    secondaryPane: coreState.secondaryPane,
    selectedPath: activePanePath,
    editorValue: activePane.content,
    editorMeta: activePane.meta,
    isDirty: activePane.isDirty,
    loadingProject: coreState.loadingProject,
    loadingDocument: coreState.loadingDocument,
    saving: coreState.saving,
    isFullscreen: coreState.isFullscreen,
    externalConflictPath: coreState.externalConflictPath,
    conflictComparisonContent: coreState.conflictComparisonContent,
    statusMessage: coreState.statusMessage,
    visibleFiles,
    corkboardOrder,
    sidebarActiveSection: sidebarUiState.values.activeSection,
    sidebarPanelCollapsed: sidebarUiState.values.panelCollapsed,
    sidebarPanelWidth: sidebarUiState.values.panelWidth,
    workspaceLayout,
  }
}

export function useProjectEditorState(): UseProjectEditorStateResult {
  const coreState = useProjectEditorCoreState()
  const [workspaceLayout, setWorkspaceLayout] = useWorkspaceLayoutState()
  const sidebarUiState = useSidebarUiState()

  const apiAvailable = Boolean(window.tramaApi?.openProject)
  const visibleFiles = useMemo(() => getVisibleSidebarPaths(coreState.snapshot), [coreState.snapshot])
  const corkboardOrder = useMemo(
    () => coreState.snapshot?.index?.corkboardOrder ?? {},
    [coreState.snapshot],
  )

  const documentState = useDocumentState(workspaceLayout, coreState.primaryPane, coreState.secondaryPane)
  const paneState = usePaneState(coreState.primaryPane, coreState.secondaryPane)
  const layoutState = useLayoutState(workspaceLayout)
  const sidebarState = useSidebarSt(sidebarUiState.values, workspaceLayout)
  const projectState = useProjectSt(coreState.rootPath, coreState.snapshot, visibleFiles, corkboardOrder)
  const uiState = useUiSt(
    apiAvailable,
    coreState.loadingProject,
    coreState.loadingDocument,
    coreState.saving,
    coreState.isFullscreen,
    coreState.externalConflictPath,
    coreState.conflictComparisonContent,
    coreState.statusMessage,
  )

  const values = useMemo(
    () => buildValues(apiAvailable, coreState, workspaceLayout, sidebarUiState, visibleFiles, corkboardOrder),
    [apiAvailable, coreState, workspaceLayout, sidebarUiState, visibleFiles, corkboardOrder],
  )

  const setters = useMemo(() => ({
    setRootPath: coreState.setRootPath,
    setSnapshot: coreState.setSnapshot,
    setPrimaryPane: coreState.setPrimaryPane,
    setSecondaryPane: coreState.setSecondaryPane,
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
  }), [coreState, workspaceLayout, sidebarUiState])

  return { values, documentState, paneState, layoutState, sidebarState, projectState, uiState, setters }
}