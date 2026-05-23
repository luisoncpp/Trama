import { useMemo } from 'preact/hooks'
import type { SidebarSection, WorkspaceLayoutState } from '../project-editor-types'
import { deriveActivePaneDocument } from '../project-editor-logic'
import { useProjectEditorCoreState } from '../use-project-editor-core-state'
import { useSidebarUiState } from '../use-sidebar-ui-state'

function buildValuesObject(
  coreState: ReturnType<typeof useProjectEditorCoreState>,
  sidebarUiState: ReturnType<typeof useSidebarUiState>,
  workspaceLayout: WorkspaceLayoutState,
  documentState: ReturnType<typeof deriveActivePaneDocument>,
  apiAvailable: boolean,
  visibleFiles: string[],
  corkboardOrder: Record<string, string[]>,
) {
  return {
    apiAvailable,
    rootPath: coreState.rootPath,
    snapshot: coreState.snapshot,
    primaryPane: coreState.primaryPane,
    secondaryPane: coreState.secondaryPane,
    selectedPath: documentState.selectedPath,
    editorValue: documentState.editorValue,
    editorMeta: documentState.editorMeta,
    isDirty: documentState.isDirty,
    loadingProject: coreState.loadingProject,
    loadingDocument: coreState.loadingDocument,
    saving: coreState.saving,
    isFullscreen: coreState.isFullscreen,
    externalConflictPath: coreState.externalConflictPath,
    conflictComparisonContent: coreState.conflictComparisonContent,
    statusMessage: coreState.statusMessage,
    visibleFiles,
    corkboardOrder,
    sidebarActiveSection: sidebarUiState.values.activeSection as SidebarSection,
    sidebarPanelCollapsed: sidebarUiState.values.panelCollapsed,
    sidebarPanelWidth: sidebarUiState.values.panelWidth,
    workspaceLayout,
  }
}

export function useProjectEditorValues(
  coreState: ReturnType<typeof useProjectEditorCoreState>,
  sidebarUiState: ReturnType<typeof useSidebarUiState>,
  workspaceLayout: WorkspaceLayoutState,
  documentState: ReturnType<typeof deriveActivePaneDocument>,
  apiAvailable: boolean,
  visibleFiles: string[],
  corkboardOrder: Record<string, string[]>,
) {
  return useMemo(
    /* buildProjectEditorValues */ () => buildValuesObject(
      coreState, sidebarUiState, workspaceLayout, documentState,
      apiAvailable, visibleFiles, corkboardOrder,
    ),
    [
      apiAvailable, coreState.rootPath, coreState.snapshot, coreState.primaryPane,
      coreState.secondaryPane, documentState.selectedPath, documentState.editorValue,
      documentState.editorMeta, documentState.isDirty, coreState.loadingProject,
      coreState.loadingDocument, coreState.saving, coreState.isFullscreen,
      coreState.externalConflictPath, coreState.conflictComparisonContent,
      coreState.statusMessage, visibleFiles, corkboardOrder,
      sidebarUiState.values.activeSection, sidebarUiState.values.panelCollapsed,
      sidebarUiState.values.panelWidth, workspaceLayout,
    ] /*Inputs for buildProjectEditorValues*/,
  )
}
