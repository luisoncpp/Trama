import { useMemo, useState } from 'preact/hooks'
import type { DocumentMeta, ProjectSnapshot } from '../../shared/ipc'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { PaneDocumentState, SidebarSection, WorkspaceLayoutState } from './project-editor-types'
import { useSidebarUiState } from './use-sidebar-ui-state'
import { useWorkspaceLayoutState } from './use-workspace-layout-state'

function collectSidebarPaths(items: ProjectSnapshot['tree'], result: string[]): void {
  for (const item of items) {
    if (item.type === 'folder') {
      result.push(`${item.path}/`)
      collectSidebarPaths(item.children ?? [], result)
      continue
    }

    result.push(item.path)
  }
}

function getVisibleSidebarPaths(snapshot: ProjectSnapshot | null): string[] {
  if (!snapshot) {
    return []
  }

  const paths: string[] = []
  collectSidebarPaths(snapshot.tree, paths)
  return paths
}

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

function buildValues(params: BuildValuesParams): ProjectEditorStateValues {
  const activePaneState: PaneDocumentState = params.workspaceLayout.activePane === 'secondary'
    ? params.secondaryPane
    : params.primaryPane
  return {
    apiAvailable: params.apiAvailable,
    rootPath: params.rootPath,
    snapshot: params.snapshot,
    primaryPane: params.primaryPane,
    secondaryPane: params.secondaryPane,
    selectedPath: activePaneState.path,
    editorValue: activePaneState.content,
    editorMeta: activePaneState.meta,
    isDirty: activePaneState.isDirty,
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

function useProjectEditorCoreState() {
  const [rootPath, setRootPath] = useState('')
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const [primaryPane, setPrimaryPane] = useState<PaneDocumentState>({ path: null, content: '', meta: {}, isDirty: false })
  const [secondaryPane, setSecondaryPane] = useState<PaneDocumentState>({ path: null, content: '', meta: {}, isDirty: false })
  const [loadingProject, setLoadingProject] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [externalConflictPath, setExternalConflictPath] = useState<string | null>(null)
  const [conflictComparisonContent, setConflictComparisonContent] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>(PROJECT_EDITOR_STRINGS.initialStatus)

  return {
    rootPath,
    setRootPath,
    snapshot,
    setSnapshot,
    primaryPane,
    setPrimaryPane,
    secondaryPane,
    setSecondaryPane,
    loadingProject,
    setLoadingProject,
    loadingDocument,
    setLoadingDocument,
    saving,
    setSaving,
    isFullscreen,
    setIsFullscreen,
    externalConflictPath,
    setExternalConflictPath,
    conflictComparisonContent,
    setConflictComparisonContent,
    statusMessage,
    setStatusMessage,
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
