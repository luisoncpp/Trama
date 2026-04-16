import { useMemo } from 'preact/hooks'
import type { DocumentMeta, ProjectSnapshot } from '../../shared/ipc'
import type { PaneDocumentState, SidebarSection, WorkspaceLayoutState } from './project-editor-types'
import { useSidebarUiState } from './use-sidebar-ui-state'
import { useWorkspaceLayoutState } from './use-workspace-layout-state'
import { useProjectEditorCoreState } from './use-project-editor-core-state'

export interface ProjectEditorStateValues {
  apiAvailable: boolean
  rootPath: string
  snapshot: ProjectSnapshot | null
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  selectedPath: string | null
  editorValue: string
  editorMeta: DocumentMeta
  isDirty: boolean
  loadingProject: boolean
  loadingDocument: boolean
  saving: boolean
  isFullscreen: boolean
  externalConflictPath: string | null
  conflictComparisonContent: string | null
  statusMessage: string
  visibleFiles: string[]
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  workspaceLayout: WorkspaceLayoutState
}

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
  setters: ProjectEditorStateSetters
}

type SidebarUiStateResult = ReturnType<typeof useSidebarUiState>

type BuildValuesParams = Omit<ProjectEditorStateValues, 'sidebarActiveSection' | 'sidebarPanelCollapsed' | 'sidebarPanelWidth' | 'selectedPath' | 'editorValue' | 'editorMeta' | 'isDirty'> & {
  sidebarUiState: SidebarUiStateResult
}

type BuildSettersParams = Omit<ProjectEditorStateSetters, 'setSidebarActiveSection' | 'setSidebarPanelCollapsed' | 'setSidebarPanelWidth'> & {
  sidebarUiState: SidebarUiStateResult
}

function getVisibleSidebarPaths(snapshot: ProjectSnapshot | null): string[] {
  if (!snapshot) return []

  const paths: string[] = []
  const collect = (items: ProjectSnapshot['tree']) => {
    for (const item of items) {
      if (item.type === 'folder') {
        paths.push(`${item.path}/`)
        collect(item.children ?? [])
        continue
      }
      paths.push(item.path)
    }
  }
  collect(snapshot.tree)
  return paths
}

function buildValues(params: BuildValuesParams): ProjectEditorStateValues {
  const activePane = params.workspaceLayout.activePane === 'secondary'
    ? params.secondaryPane
    : params.primaryPane
  const activePanePath = params.workspaceLayout.activePane === 'secondary'
    ? params.workspaceLayout.secondaryPath
    : params.workspaceLayout.primaryPath

  return {
    apiAvailable: params.apiAvailable,
    rootPath: params.rootPath,
    snapshot: params.snapshot,
    primaryPane: params.primaryPane,
    secondaryPane: params.secondaryPane,
    selectedPath: activePanePath,
    editorValue: activePane.content,
    editorMeta: activePane.meta,
    isDirty: activePane.isDirty,
    loadingProject: params.loadingProject,
    loadingDocument: params.loadingDocument,
    saving: params.saving,
    isFullscreen: params.isFullscreen,
    externalConflictPath: params.externalConflictPath,
    conflictComparisonContent: params.conflictComparisonContent,
    statusMessage: params.statusMessage,
    visibleFiles: params.visibleFiles,
    sidebarActiveSection: params.sidebarUiState.values.activeSection,
    sidebarPanelCollapsed: params.sidebarUiState.values.panelCollapsed,
    sidebarPanelWidth: params.sidebarUiState.values.panelWidth,
    workspaceLayout: params.workspaceLayout,
  }
}

function buildSetters(params: BuildSettersParams): ProjectEditorStateSetters {
  return {
    setRootPath: params.setRootPath,
    setSnapshot: params.setSnapshot,
    setPrimaryPane: params.setPrimaryPane,
    setSecondaryPane: params.setSecondaryPane,
    setLoadingProject: params.setLoadingProject,
    setLoadingDocument: params.setLoadingDocument,
    setSaving: params.setSaving,
    setIsFullscreen: params.setIsFullscreen,
    setExternalConflictPath: params.setExternalConflictPath,
    setConflictComparisonContent: params.setConflictComparisonContent,
    setStatusMessage: params.setStatusMessage,
    setSidebarActiveSection: params.sidebarUiState.setters.setActiveSection,
    setSidebarPanelCollapsed: params.sidebarUiState.setters.setPanelCollapsed,
    setSidebarPanelWidth: params.sidebarUiState.setters.setPanelWidth,
    setWorkspaceLayout: params.setWorkspaceLayout,
  }
}

export function useProjectEditorState(): UseProjectEditorStateResult {
  const coreState = useProjectEditorCoreState()
  const [workspaceLayout, setWorkspaceLayout] = useWorkspaceLayoutState()
  const sidebarUiState = useSidebarUiState()

  const apiAvailable = Boolean(window.tramaApi?.openProject)
  const visibleFiles = useMemo(() => getVisibleSidebarPaths(coreState.snapshot), [coreState.snapshot])

  const values = buildValues({
    apiAvailable,
    rootPath: coreState.rootPath,
    snapshot: coreState.snapshot,
    primaryPane: coreState.primaryPane,
    secondaryPane: coreState.secondaryPane,
    loadingProject: coreState.loadingProject,
    loadingDocument: coreState.loadingDocument,
    saving: coreState.saving,
    isFullscreen: coreState.isFullscreen,
    externalConflictPath: coreState.externalConflictPath,
    conflictComparisonContent: coreState.conflictComparisonContent,
    statusMessage: coreState.statusMessage,
    visibleFiles,
    workspaceLayout,
    sidebarUiState,
  })

  const setters = buildSetters({
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
    setWorkspaceLayout,
    sidebarUiState,
  })

  return { values, setters }
}