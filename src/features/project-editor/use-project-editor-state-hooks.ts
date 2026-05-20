import { useMemo } from 'preact/hooks'
import type { WorkspaceLayoutState, SidebarSection } from './project-editor-types'
import type { ProjectSnapshot } from '../../shared/ipc'

export interface SettersInput {
  setRootPath: (value: string) => void
  setSnapshot: (value: ProjectSnapshot | null) => void
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

export function useProjectEditorSetters(input: SettersInput) {
  const {
    setRootPath, setSnapshot, setLoadingProject, setLoadingDocument,
    setSaving, setIsFullscreen, setExternalConflictPath,
    setConflictComparisonContent, setStatusMessage,
    setSidebarActiveSection, setSidebarPanelCollapsed, setSidebarPanelWidth,
    setWorkspaceLayout,
  } = input

  return useMemo(() => ({
    setRootPath,
    setSnapshot,
    setLoadingProject,
    setLoadingDocument,
    setSaving,
    setIsFullscreen,
    setExternalConflictPath,
    setConflictComparisonContent,
    setStatusMessage,
    setSidebarActiveSection,
    setSidebarPanelCollapsed,
    setSidebarPanelWidth,
    setWorkspaceLayout,
  }), [
    setRootPath, setSnapshot, setLoadingProject, setLoadingDocument,
    setSaving, setIsFullscreen, setExternalConflictPath,
    setConflictComparisonContent, setStatusMessage,
    setSidebarActiveSection, setSidebarPanelCollapsed, setSidebarPanelWidth,
    setWorkspaceLayout,
  ])
}

export function usePaneBindings(
  primaryPane: import('./project-editor-types').PaneDocumentState,
  secondaryPane: import('./project-editor-types').PaneDocumentState,
  setPrimaryPane: (value: import('./project-editor-types').PaneDocumentState | ((prev: import('./project-editor-types').PaneDocumentState) => import('./project-editor-types').PaneDocumentState)) => void,
  setSecondaryPane: (value: import('./project-editor-types').PaneDocumentState | ((prev: import('./project-editor-types').PaneDocumentState) => import('./project-editor-types').PaneDocumentState)) => void,
) {
  return useMemo(
    () => ({
      primaryPane,
      secondaryPane,
      setPrimaryPane,
      setSecondaryPane,
    }),
    [primaryPane, secondaryPane, setPrimaryPane, setSecondaryPane],
  )
}
