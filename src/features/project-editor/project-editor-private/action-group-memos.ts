import { useMemo } from 'preact/hooks'
import type {
  ProjectEditorLayoutState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
  WorkspacePane,
} from '../project-editor-types'
import type { OpenProjectOptions } from '../open-project-types'
import type { PaneWorkspace } from '../pane'
import type { ProjectEditorActionSetters } from './action-group-types'
import { buildConflictActionGroup } from './conflict-action-group'
import { buildSidebarActions } from './sidebar-action-group'
import { buildWorkspaceActions } from './workspace-action-group'

interface ActionMemoParams {
  layoutState: ProjectEditorLayoutState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: ProjectEditorActionSetters
  paneWorkspace: PaneWorkspace
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>
  openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
}

export function useSidebarProjectEditorActions(params: ActionMemoParams) {
  const { layoutState, projectState, uiState, sidebarState, setters, paneWorkspace, loadDocument, openProject } = params
  return useMemo(
    /* buildSidebarProjectEditorActions */ () => buildSidebarActions({
      layoutState,
      projectState,
      uiState,
      sidebarState,
      setters,
      paneWorkspace,
      loadDocument,
      openProject,
    }),
    [
      layoutState,
      projectState,
      sidebarState,
      setters,
      paneWorkspace,
      loadDocument,
      openProject,
    ] /*Inputs for buildSidebarProjectEditorActions*/,
  )
}

export function useWorkspaceProjectEditorActions(params: ActionMemoParams) {
  const { layoutState, projectState, uiState, sidebarState, setters, paneWorkspace, loadDocument, openProject } = params
  return useMemo(
    /* buildWorkspaceProjectEditorActions */ () => buildWorkspaceActions({
      layoutState,
      projectState,
      uiState,
      sidebarState,
      setters,
      paneWorkspace,
      loadDocument,
      openProject,
    }),
    [
      layoutState,
      projectState,
      uiState,
      setters,
      paneWorkspace,
      loadDocument,
    ] /*Inputs for buildWorkspaceProjectEditorActions*/,
  )
}

export function useConflictProjectEditorActions(params: ActionMemoParams) {
  const { layoutState, projectState, uiState, sidebarState, setters, paneWorkspace, loadDocument, openProject } = params
  return useMemo(
    /* buildConflictProjectEditorActions */ () => buildConflictActionGroup({
      layoutState,
      projectState,
      uiState,
      sidebarState,
      setters,
      paneWorkspace,
      loadDocument,
      openProject,
    }),
    [
      projectState,
      uiState,
      setters,
      paneWorkspace,
      loadDocument,
      openProject,
    ] /*Inputs for buildConflictProjectEditorActions*/,
  )
}
