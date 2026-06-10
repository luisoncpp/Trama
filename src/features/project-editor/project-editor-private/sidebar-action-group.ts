import type { ProjectEditorActions, SidebarSection } from '../project-editor-types'
import * as sidebarFileActions from '../sidebar-file-actions'
import type { ActionGroupParams } from './action-group-types'

export function buildSidebarActions(params: ActionGroupParams): Pick<ProjectEditorActions,
  | 'pickProjectFolder'
  | 'closeProject'
  | 'revealInFileManager'
  | 'selectFile'
  | 'setSidebarSection'
  | 'toggleSidebarPanelCollapsed'
  | 'setSidebarPanelWidth'
  | 'createArticle'
  | 'createMap'
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

function getTargetPath(rootPath: string, relativePath?: string) {
  const cleanRoot = rootPath.replace(/\/$/, '')
  return relativePath ? `${cleanRoot}/${relativePath.replace(/^\//, '')}` : cleanRoot
}

function buildSidebarUiActions({
  layoutState,
  projectState,
  sidebarState,
  setters,
  paneWorkspace,
  loadDocument,
  openProject,
  clearEditor,
}: ActionGroupParams) {
  return {
    pickProjectFolder: () => sidebarFileActions.pickProjectFolder({ openProject, setStatusMessage: setters.setStatusMessage }),
    closeProject: () => sidebarFileActions.closeProject({
      clearEditor,
      setRootPath: setters.setRootPath,
      setSnapshot: setters.setSnapshot,
      clearLastProjectRootPath: setters.clearLastProjectRootPath,
      setGitHistory: setters.setGitHistory,
      setStatusMessage: setters.setStatusMessage,
    }),
    revealInFileManager: (relativePath?: string) => {
      const targetPath = getTargetPath(projectState.rootPath, relativePath)
      return sidebarFileActions.revealInFileManager(
        targetPath,
        setters.setStatusMessage
      )
    },
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
    createArticle: (input: any, templatePath?: string | null) => sidebarFileActions.createArticle(input, {
      projectState,
      sidebarState,
      setStatusMessage: setters.setStatusMessage,
      openProject,
    }, templatePath),
    createMap: (input: any) => sidebarFileActions.createMap(input, {
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
