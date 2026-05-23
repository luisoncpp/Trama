import type { ProjectEditorActions, SidebarSection } from '../project-editor-types'
import * as sidebarFileActions from '../sidebar-file-actions'
import type { ActionGroupParams } from './action-group-types'

export function buildSidebarActions(params: ActionGroupParams): Pick<ProjectEditorActions,
  | 'pickProjectFolder'
  | 'selectFile'
  | 'setSidebarSection'
  | 'toggleSidebarPanelCollapsed'
  | 'setSidebarPanelWidth'
  | 'createArticle'
  | 'createCategory'
  | 'renameFile'
  | 'deleteFile'
  | 'editFileTags'
  | 'moveFile'
  | 'renameFolder'
  | 'deleteFolder'
  | 'moveFolder'
  | 'reorderFiles'
> {
  return {
    ...buildSidebarUiActions(params),
    ...buildSidebarFileCreateActions(params),
    ...buildSidebarFileCrudActions(params),
    ...buildSidebarFolderActions(params),
  }
}

function buildSidebarUiActions({
  layoutState,
  sidebarState,
  setters,
  paneWorkspace,
  loadDocument,
  openProject,
}: ActionGroupParams) {
  return {
    pickProjectFolder: () => sidebarFileActions.pickProjectFolder({ openProject, setStatusMessage: setters.setStatusMessage }),
    selectFile: (filePath: string) => sidebarFileActions.selectFile(filePath, {
      workspace: paneWorkspace,
      loadDocument,
      setWorkspaceLayout: setters.setWorkspaceLayout,
    }),
    setSidebarSection: (section: SidebarSection) => sidebarFileActions.setSidebarSection(
      section,
      sidebarState,
      layoutState.workspaceLayout,
      setters.setSidebarActiveSection,
      setters.setSidebarPanelCollapsed,
    ),
    toggleSidebarPanelCollapsed: () => sidebarFileActions.toggleSidebarPanelCollapsed(
      layoutState.workspaceLayout,
      sidebarState.sidebarPanelCollapsed,
      setters.setSidebarPanelCollapsed,
    ),
    setSidebarPanelWidth: (width: number) => sidebarFileActions.setSidebarPanelWidth(width, setters.setSidebarPanelWidth),
  }
}

function buildSidebarFileCreateActions({ projectState, sidebarState, setters, openProject }: ActionGroupParams) {
  return {
    createArticle: (input: any) => sidebarFileActions.createArticle(input, {
      projectState,
      sidebarState,
      setStatusMessage: setters.setStatusMessage,
      openProject,
    }),
    createCategory: (input: any) => sidebarFileActions.createCategory(input, {
      projectState,
      sidebarState,
      setStatusMessage: setters.setStatusMessage,
      openProject,
    }),
  }
}

function buildSidebarFileCrudActions({ projectState, setters, paneWorkspace, openProject }: ActionGroupParams) {
  return {
    renameFile: (input: any) => sidebarFileActions.renameFile(input, {
      projectState,
      setStatusMessage: setters.setStatusMessage,
      openProject,
    }),
    deleteFile: (path: string, options: any) => sidebarFileActions.deleteFile(path, options, {
      projectState,
      setStatusMessage: setters.setStatusMessage,
      openProject,
    }),
    editFileTags: (path: string, tags: string[]) => sidebarFileActions.editFileTags(path, tags, {
      workspace: paneWorkspace,
      projectState,
      setStatusMessage: setters.setStatusMessage,
    }),
    moveFile: (sourcePath: string, targetFolder: string) => sidebarFileActions.moveFile(sourcePath, targetFolder, {
      workspace: paneWorkspace,
      projectState,
      setStatusMessage: setters.setStatusMessage,
      openProject,
    }),
  }
}

function buildSidebarFolderActions({ projectState, setters, paneWorkspace, openProject }: ActionGroupParams) {
  return {
    renameFolder: (input: any) => sidebarFileActions.renameFolder(input, {
      workspace: paneWorkspace,
      projectState,
      setStatusMessage: setters.setStatusMessage,
      setWorkspaceLayout: setters.setWorkspaceLayout,
      openProject,
    }),
    deleteFolder: (path: string) => sidebarFileActions.deleteFolder(path, {
      workspace: paneWorkspace,
      projectState,
      setStatusMessage: setters.setStatusMessage,
      setWorkspaceLayout: setters.setWorkspaceLayout,
      openProject,
    }),
    moveFolder: (sourcePath: string, targetParent: string) => sidebarFileActions.moveFolder(sourcePath, targetParent, {
      workspace: paneWorkspace,
      projectState,
      setStatusMessage: setters.setStatusMessage,
      setWorkspaceLayout: setters.setWorkspaceLayout,
      openProject,
    }),
    reorderFiles: (folderPath: string, orderedIds: string[]) => sidebarFileActions.reorderFiles(folderPath, orderedIds, {
      setStatusMessage: setters.setStatusMessage,
      openProject,
      rootPath: projectState.rootPath,
    }),
  }
}
