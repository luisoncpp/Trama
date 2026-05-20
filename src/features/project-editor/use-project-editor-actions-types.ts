import type {
  ProjectEditorUiState,
  WorkspacePane,
  SidebarSection,
} from './project-editor-types'
import type { ProjectEditorLayoutState, ProjectEditorProjectState, ProjectEditorSidebarState } from './project-editor-types'
import type { PaneWorkspace } from './pane'

export interface BuildActionsInput {
  layoutState: ProjectEditorLayoutState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: {
    setWorkspaceLayout: (value: any) => void
    setSidebarPanelCollapsed: (value: boolean) => void
    setSidebarActiveSection: (value: SidebarSection) => void
    setSidebarPanelWidth: (value: number) => void
    setStatusMessage: (value: string) => void
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    setIsFullscreen?: (value: boolean) => void
  }
  paneWorkspace: PaneWorkspace
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
}
