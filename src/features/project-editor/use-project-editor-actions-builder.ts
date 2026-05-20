import type {
  ProjectEditorActions,
  WorkspacePane,
  SidebarCreateInput,
  SidebarRenameInput,
  FocusScope,
  SidebarSection,
} from './project-editor-types'
import type { PaneWorkspace } from './pane'
import * as workspaceActions from './workspace-actions'
import * as sidebarFileActions from './sidebar-file-actions'
import type { BuildActionsInput } from './use-project-editor-actions-types'
import { buildConflictActions } from './use-project-editor-conflict-actions-builder'

function buildWorkspaceActions(input: BuildActionsInput): Pick<ProjectEditorActions,
  | 'toggleWorkspaceLayoutMode' | 'setWorkspaceLayoutRatio' | 'setWorkspaceActivePane'
  | 'openFileInPane' | 'setFullscreenEnabled' | 'toggleFocusMode'
  | 'setFocusScope' | 'setZoomLevel' | 'updateEditorValue' | 'saveNow' | 'revertChanges'
> {
  const { layoutState, projectState, uiState, setters, paneWorkspace, loadDocument } = input
  return {
    toggleWorkspaceLayoutMode: () =>
      workspaceActions.toggleWorkspaceLayoutMode(projectState, setters.setWorkspaceLayout),
    setWorkspaceLayoutRatio: (ratio: number) =>
      workspaceActions.setWorkspaceLayoutRatio(ratio, setters.setWorkspaceLayout),
    setWorkspaceActivePane: (pane: WorkspacePane) =>
      workspaceActions.setWorkspaceActivePane(pane, {
        workspace: paneWorkspace, setWorkspaceLayout: setters.setWorkspaceLayout,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        setStatusMessage: setters.setStatusMessage, loadDocument,
      }),
    openFileInPane: (filePath: string, pane: WorkspacePane) =>
      workspaceActions.openFileInPane(filePath, pane, {
        workspace: paneWorkspace, setWorkspaceLayout: setters.setWorkspaceLayout,
        setStatusMessage: setters.setStatusMessage, loadDocument,
      }),
    setFullscreenEnabled: (enabled: boolean) =>
      workspaceActions.setFullscreenEnabled(enabled, {
        setIsFullscreen: setters.setIsFullscreen, setStatusMessage: setters.setStatusMessage,
      }),
    toggleFocusMode: () =>
      workspaceActions.toggleFocusMode(layoutState.workspaceLayout, setters.setSidebarPanelCollapsed, setters.setWorkspaceLayout),
    setFocusScope: (scope: FocusScope) =>
      workspaceActions.setFocusScope(scope, setters.setWorkspaceLayout),
    setZoomLevel: (level: number) =>
      workspaceActions.setZoomLevel(level, setters.setWorkspaceLayout),
    updateEditorValue: (value: string, pane?: WorkspacePane) =>
      workspaceActions.updateEditorValue(value, pane, paneWorkspace),
    saveNow: (pane?: WorkspacePane) =>
      workspaceActions.saveNow(pane, {
        workspace: paneWorkspace, uiState,
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
      }),
    revertChanges: (pane?: WorkspacePane) =>
      workspaceActions.revertChanges(pane, {
        workspace: paneWorkspace, loadDocument,
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        uiState,
      }),
  }
}

function buildSidebarUiActions(input: BuildActionsInput): Pick<ProjectEditorActions,
  | 'pickProjectFolder' | 'selectFile' | 'setSidebarSection'
  | 'toggleSidebarPanelCollapsed' | 'setSidebarPanelWidth'
> {
  const { layoutState, sidebarState, setters, paneWorkspace, loadDocument, openProject } = input
  return {
    pickProjectFolder: () =>
      sidebarFileActions.pickProjectFolder({ openProject, setStatusMessage: setters.setStatusMessage }),
    selectFile: (filePath: string) =>
      sidebarFileActions.selectFile(filePath, {
        workspace: paneWorkspace, loadDocument, setWorkspaceLayout: setters.setWorkspaceLayout,
      }),
    setSidebarSection: (section: SidebarSection) =>
      sidebarFileActions.setSidebarSection(
        section, sidebarState, layoutState.workspaceLayout,
        setters.setSidebarActiveSection, setters.setSidebarPanelCollapsed,
      ),
    toggleSidebarPanelCollapsed: () =>
      sidebarFileActions.toggleSidebarPanelCollapsed(
        layoutState.workspaceLayout, sidebarState.sidebarPanelCollapsed, setters.setSidebarPanelCollapsed,
      ),
    setSidebarPanelWidth: (width: number) =>
      sidebarFileActions.setSidebarPanelWidth(width, setters.setSidebarPanelWidth),
  }
}

function buildFileActions(input: BuildActionsInput): Pick<ProjectEditorActions,
  | 'createArticle' | 'createCategory' | 'renameFile' | 'deleteFile' | 'editFileTags' | 'moveFile'
> {
  const { projectState, setters, paneWorkspace, openProject } = input
  return {
    createArticle: (inputItem: SidebarCreateInput) =>
      sidebarFileActions.createArticle(inputItem, {
        projectState, sidebarState: input.sidebarState,
        setStatusMessage: setters.setStatusMessage, openProject,
      }),
    createCategory: (inputItem: SidebarCreateInput) =>
      sidebarFileActions.createCategory(inputItem, {
        projectState, sidebarState: input.sidebarState,
        setStatusMessage: setters.setStatusMessage, openProject,
      }),
    renameFile: (inputItem: SidebarRenameInput) =>
      sidebarFileActions.renameFile(inputItem, {
        projectState, setStatusMessage: setters.setStatusMessage, openProject,
      }),
    deleteFile: (path: string, options?: { deleteAssociatedImages?: boolean }) =>
      sidebarFileActions.deleteFile(path, options, {
        projectState, setStatusMessage: setters.setStatusMessage, openProject,
      }),
    editFileTags: (path: string, tags: string[]) =>
      sidebarFileActions.editFileTags(path, tags, {
        workspace: paneWorkspace, projectState, setStatusMessage: setters.setStatusMessage,
      }),
    moveFile: (sourcePath: string, targetFolder: string) =>
      sidebarFileActions.moveFile(sourcePath, targetFolder, {
        workspace: paneWorkspace, projectState,
        setStatusMessage: setters.setStatusMessage, openProject,
      }),
  }
}

function buildFolderActions(input: BuildActionsInput): Pick<ProjectEditorActions,
  | 'renameFolder' | 'deleteFolder' | 'moveFolder' | 'reorderFiles'
> {
  const { projectState, setters, paneWorkspace, openProject } = input
  return {
    renameFolder: (inputItem: SidebarRenameInput) =>
      sidebarFileActions.renameFolder(inputItem, {
        workspace: paneWorkspace, projectState,
        setStatusMessage: setters.setStatusMessage,
        setWorkspaceLayout: setters.setWorkspaceLayout, openProject,
      }),
    deleteFolder: (path: string) =>
      sidebarFileActions.deleteFolder(path, {
        workspace: paneWorkspace, projectState,
        setStatusMessage: setters.setStatusMessage,
        setWorkspaceLayout: setters.setWorkspaceLayout, openProject,
      }),
    moveFolder: (sourcePath: string, targetParent: string) =>
      sidebarFileActions.moveFolder(sourcePath, targetParent, {
        workspace: paneWorkspace, projectState,
        setStatusMessage: setters.setStatusMessage,
        setWorkspaceLayout: setters.setWorkspaceLayout, openProject,
      }),
    reorderFiles: (folderPath: string, orderedIds: string[]) =>
      sidebarFileActions.reorderFiles(folderPath, orderedIds, {
        setStatusMessage: setters.setStatusMessage, openProject,
        rootPath: projectState.rootPath,
      }),
  }
}

export function buildActions(input: BuildActionsInput): ProjectEditorActions {
  return {
    ...buildWorkspaceActions(input),
    ...buildSidebarUiActions(input),
    ...buildFileActions(input),
    ...buildFolderActions(input),
    ...buildConflictActions(input),
  }
}
