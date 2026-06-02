import type {
  ProjectEditorLayoutState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
  SidebarSection,
  WorkspacePane,
} from '../project-editor-types'
import type { OpenProjectOptions } from '../open-project-types'
import type { PaneWorkspace } from '../pane'

export interface ProjectEditorActionSetters {
  setLoadingDocument: (value: boolean) => void
  setLoadingProject: (value: boolean) => void
  setSaving: (value: boolean) => void
  setStatusMessage: (value: string) => void
  setGitHistory: (value: any) => void
  setExternalConflictPath: (value: string | null) => void
  setConflictComparisonContent: (value: string | null) => void
  setWorkspaceLayout: (value: any) => void
  setSidebarPanelCollapsed: (value: boolean) => void
  setSidebarActiveSection: (value: SidebarSection) => void
  setSidebarPanelWidth: (value: number) => void
  setRootPath: (value: string) => void
  setSnapshot: (value: any) => void
  setIsFullscreen: (value: boolean) => void
}

export interface ActionGroupParams {
  layoutState: ProjectEditorLayoutState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: ProjectEditorActionSetters & {
    setLastProjectRootPath: (value: string) => void
    clearLastProjectRootPath: () => void
  }
  paneWorkspace: PaneWorkspace
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>
  openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  clearEditor: () => void
}
