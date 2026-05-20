import { useMemo } from 'preact/hooks'
import type { ProjectEditorStateValues, SidebarSection, WorkspaceLayoutState } from './project-editor-types'
import type { ProjectSnapshot } from '../../shared/ipc'
import { deriveActivePaneDocument } from './project-editor-logic'
import { getVisibleSidebarPaths, buildValues } from './use-project-editor-state-helpers'

export interface CoreStateSnapshot {
  rootPath: string
  snapshot: ProjectSnapshot | null
  primaryPane: import('./project-editor-types').PaneDocumentState
  secondaryPane: import('./project-editor-types').PaneDocumentState
  loadingProject: boolean
  loadingDocument: boolean
  saving: boolean
  isFullscreen: boolean
  externalConflictPath: string | null
  conflictComparisonContent: string | null
  statusMessage: string
}

export interface SidebarUiSnapshot {
  activeSection: SidebarSection
  panelCollapsed: boolean
  panelWidth: number
}

function useProjectValues(
  coreState: CoreStateSnapshot,
  workspaceLayout: WorkspaceLayoutState,
  sidebarUi: SidebarUiSnapshot,
  visibleFiles: string[],
  corkboardOrder: Record<string, string[]>,
  selectedPath: string | null,
  editorValue: string,
  editorMeta: Record<string, unknown>,
  isDirty: boolean,
): ProjectEditorStateValues {
  const apiAvailable = Boolean(window.tramaApi?.openProject)
  return useMemo(
    () => buildValues(
      apiAvailable, coreState.rootPath, coreState.snapshot, coreState.primaryPane, coreState.secondaryPane,
      selectedPath, editorValue, editorMeta, isDirty,
      coreState.loadingProject, coreState.loadingDocument, coreState.saving, coreState.isFullscreen,
      coreState.externalConflictPath, coreState.conflictComparisonContent, coreState.statusMessage,
      visibleFiles, corkboardOrder,
      sidebarUi.activeSection, sidebarUi.panelCollapsed, sidebarUi.panelWidth,
      workspaceLayout,
    ),
    [
      apiAvailable, coreState.rootPath, coreState.snapshot, coreState.primaryPane, coreState.secondaryPane,
      selectedPath, editorValue, editorMeta, isDirty,
      coreState.loadingProject, coreState.loadingDocument, coreState.saving, coreState.isFullscreen,
      coreState.externalConflictPath, coreState.conflictComparisonContent, coreState.statusMessage,
      visibleFiles, corkboardOrder,
      sidebarUi.activeSection, sidebarUi.panelCollapsed, sidebarUi.panelWidth,
      workspaceLayout,
    ],
  )
}

export function useProjectEditorSubStates(
  coreState: CoreStateSnapshot,
  workspaceLayout: WorkspaceLayoutState,
  sidebarUi: SidebarUiSnapshot,
) {
  const { snapshot, primaryPane, secondaryPane } = coreState
  const visibleFiles = useMemo(() => getVisibleSidebarPaths(snapshot), [snapshot])
  const corkboardOrder = useMemo(() => snapshot?.index?.corkboardOrder ?? {}, [snapshot])

  const doc = deriveActivePaneDocument(workspaceLayout, primaryPane, secondaryPane)
  const documentState = useMemo(
    () => ({ selectedPath: doc.selectedPath, editorValue: doc.editorValue, editorMeta: doc.editorMeta, isDirty: doc.isDirty }),
    [doc.selectedPath, doc.editorValue, doc.editorMeta, doc.isDirty],
  )

  const layoutState = useMemo(() => ({ workspaceLayout }), [workspaceLayout])

  const sidebarState = useMemo(
    () => ({
      sidebarActiveSection: sidebarUi.activeSection,
      sidebarPanelCollapsed: sidebarUi.panelCollapsed,
      sidebarPanelWidth: sidebarUi.panelWidth,
      focusModeEnabled: workspaceLayout.focusModeEnabled,
    }),
    [sidebarUi.activeSection, sidebarUi.panelCollapsed, sidebarUi.panelWidth, workspaceLayout.focusModeEnabled],
  )

  const projectState = useMemo(
    () => ({ rootPath: coreState.rootPath, snapshot, visibleFiles, corkboardOrder }),
    [coreState.rootPath, snapshot, visibleFiles, corkboardOrder],
  )

  const apiAvailable = Boolean(window.tramaApi?.openProject)
  const uiState = useMemo(
    () => ({
      apiAvailable,
      loadingProject: coreState.loadingProject,
      loadingDocument: coreState.loadingDocument,
      saving: coreState.saving,
      isFullscreen: coreState.isFullscreen,
      externalConflictPath: coreState.externalConflictPath,
      conflictComparisonContent: coreState.conflictComparisonContent,
      statusMessage: coreState.statusMessage,
    }),
    [apiAvailable, coreState.loadingProject, coreState.loadingDocument, coreState.saving, coreState.isFullscreen,
      coreState.externalConflictPath, coreState.conflictComparisonContent, coreState.statusMessage],
  )
  const values = useProjectValues(
    coreState, workspaceLayout, sidebarUi,
    visibleFiles, corkboardOrder,
    doc.selectedPath, doc.editorValue, doc.editorMeta, doc.isDirty,
  )

  return { documentState, layoutState, sidebarState, projectState, uiState, values }
}
