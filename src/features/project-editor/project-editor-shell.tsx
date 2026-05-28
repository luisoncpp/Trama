import { memo } from 'preact/compat'
import { useMemo } from 'preact/hooks'
import type { ProjectEditorModel } from './project-editor-types'
import { SidebarPanel } from './components/sidebar/sidebar-panel.tsx'
import {
  buildSidebarSectionProps,
  type ProjectEditorShellActions,
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
    ] /*Inputs for buildProjectEditorShellState*/,
  )
}

export function useProjectEditorShellActions(model: ProjectEditorModel): ProjectEditorShellActions {
  const { actions } = model
  return useMemo(
    /* buildProjectEditorShellActions */ () => ({
      selectFile: actions.selectFile,
      setSidebarSection: actions.setSidebarSection,
      toggleSidebarPanelCollapsed: actions.toggleSidebarPanelCollapsed,
      setSidebarPanelWidth: actions.setSidebarPanelWidth,
      createArticle: actions.createArticle,
      createCategory: actions.createCategory,
      renameFile: actions.renameFile,
      renameFolder: actions.renameFolder,
      deleteFolder: actions.deleteFolder,
      deleteFile: actions.deleteFile,
      editFileTags: actions.editFileTags,
      reorderFiles: actions.reorderFiles,
      moveFile: actions.moveFile,
      moveFolder: actions.moveFolder,
      pickProjectFolder: actions.pickProjectFolder,
      setFocusScope: actions.setFocusScope,
    }),
    [
      actions.selectFile,
      actions.setSidebarSection,
      actions.toggleSidebarPanelCollapsed,
      actions.setSidebarPanelWidth,
      actions.createArticle,
      actions.createCategory,
      actions.renameFile,
      actions.renameFolder,
      actions.deleteFolder,
      actions.deleteFile,
      actions.editFileTags,
      actions.reorderFiles,
      actions.moveFile,
      actions.moveFolder,
      actions.pickProjectFolder,
      actions.setFocusScope,
    ] /*Inputs for buildProjectEditorShellActions*/,
  )
}
