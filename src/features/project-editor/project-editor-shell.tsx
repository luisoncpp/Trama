import { memo } from 'preact/compat'
import { useMemo } from 'preact/hooks'
import type { ProjectEditorModel } from './project-editor-types'
import { SidebarPanel } from './components/sidebar/sidebar-panel.tsx'
import {
  buildSidebarSectionProps,
  type ProjectEditorShellState,
  type ProjectEditorSidebarShellProps,
} from './project-editor-shell-props'

function ProjectEditorSidebarShellInner(props: ProjectEditorSidebarShellProps) {
  return <SidebarPanel {...buildSidebarSectionProps(props)} />
}

export const ProjectEditorSidebarShell = memo(ProjectEditorSidebarShellInner)

export function useProjectEditorShellState(model: ProjectEditorModel): ProjectEditorShellState {
  const { state } = model
  return useMemo(
    /* buildProjectEditorShellState */ () => ({
      apiAvailable: state.apiAvailable,
      rootPath: state.rootPath,
      visibleFiles: state.visibleFiles,
      selectedPath: state.selectedPath,
      loadingProject: state.loadingProject,
      loadingDocument: state.loadingDocument,
      statusMessage: state.statusMessage,
      corkboardOrder: state.corkboardOrder,
      sidebarActiveSection: state.sidebarActiveSection,
      sidebarPanelCollapsed: state.sidebarPanelCollapsed,
      sidebarPanelWidth: state.sidebarPanelWidth,
      workspaceLayout: state.workspaceLayout,
      gitHistory: state.gitHistory,
    }),
    [
      state.apiAvailable,
      state.rootPath,
      state.visibleFiles,
      state.selectedPath,
      state.loadingProject,
      state.loadingDocument,
      state.statusMessage,
      state.corkboardOrder,
      state.sidebarActiveSection,
      state.sidebarPanelCollapsed,
      state.sidebarPanelWidth,
      state.workspaceLayout,
      state.gitHistory,
    ] /*Inputs for buildProjectEditorShellState*/,
  )
}


