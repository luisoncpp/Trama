import { useMemo } from 'preact/hooks'
import type { ProjectEditorActions } from './project-editor-types'
import { deriveActivePaneDocument } from './project-editor-logic'
import {
  useCloseConflictCompareAction,
  useResolveConflictCompareAction,
  useResolveConflictKeepAction,
  useResolveConflictReloadAction,
  useResolveConflictSaveAsCopyAction,
} from './use-project-editor-conflict-actions'
import {
  useAssignFileToActivePaneAction,
  useOpenFileInPaneAction,
} from './use-project-editor-layout-actions'
import { useProjectEditorCreateActions } from './use-project-editor-create-actions'
import { useProjectEditorFileActions } from './use-project-editor-file-actions'
import { useProjectEditorFolderActions } from './use-project-editor-folder-actions'
import type {
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
} from './project-editor-types'
import type { PaneWorkspace } from './pane'
import {
  useEditorViewActions,
  useMoveFileAction,
  useProjectPickerActions,
  useReorderFilesAction,
  useSelectFileAction,
  useSidebarActions,
  useWorkspaceLayoutActions,
  type UseProjectEditorUiActionsParams,
} from './use-project-editor-ui-actions-helpers'

function buildProjectEditorActions(input: ProjectEditorActions): ProjectEditorActions {
  return input
}

export function usePrimaryProjectEditorActions(
  workspace: PaneWorkspace,
  projectState: ProjectEditorProjectState,
  uiState: ProjectEditorUiState,
  sidebarState: ProjectEditorSidebarState,
  setters: UseProjectEditorUiActionsParams['setters'],
  openProject: UseProjectEditorUiActionsParams['openProject'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
) {
  const assignFileToActivePane = useAssignFileToActivePaneAction(workspace.layout, setters)
  const openFileInPane = useOpenFileInPaneAction({ workspace, setters, loadDocument })
  const selectFile = useSelectFileAction({ workspace, loadDocument, assignFileToActivePane })
  const { createArticle, createCategory } = useProjectEditorCreateActions({ projectState, sidebarState, setters, openProject })
  const { renameFile, deleteFile, editFileTags } = useProjectEditorFileActions({ workspace, projectState, setters, openProject })
  const { renameFolder, deleteFolder, moveFolder } = useProjectEditorFolderActions({ workspace, projectState, setters, openProject })
  const sidebarActions = useSidebarActions(workspace.layout, sidebarState, setters)
  const layoutActions = useWorkspaceLayoutActions(workspace, projectState, setters, loadDocument)
  const editorViewActions = useEditorViewActions(workspace, uiState, setters, loadDocument)
  const projectPickerActions = useProjectPickerActions({ openProject, setters })
  const reorderFiles = useReorderFilesAction({ setters, openProject, rootPath: projectState.rootPath })
  const moveFile = useMoveFileAction({ workspace, projectState, setters, openProject })

  return {
    ...projectPickerActions,
    selectFile,
    openFileInPane,
    createArticle,
    createCategory,
    renameFolder,
    renameFile,
    deleteFile,
    deleteFolder,
    editFileTags,
    reorderFiles,
    moveFile,
    moveFolder,
    ...sidebarActions,
    ...layoutActions,
    ...editorViewActions,
  }
}

export function useSecondaryProjectEditorActions(
  workspace: PaneWorkspace,
  documentState: { selectedPath: string | null; editorValue: string; editorMeta: any; isDirty: boolean },
  projectState: ProjectEditorProjectState,
  uiState: ProjectEditorUiState,
  setters: UseProjectEditorUiActionsParams['setters'],
  openProject: UseProjectEditorUiActionsParams['openProject'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
) {
  const resolveConflictReload = useResolveConflictReloadAction({ workspace, uiState, setters, loadDocument })
  const resolveConflictKeep = useResolveConflictKeepAction(setters)
  const resolveConflictSaveAsCopy = useResolveConflictSaveAsCopyAction({ documentState, projectState, setters, openProject, workspace })
  const resolveConflictCompare = useResolveConflictCompareAction({ uiState, setters })
  const closeConflictCompare = useCloseConflictCompareAction(setters)

  return {
    resolveConflictReload,
    resolveConflictKeep,
    resolveConflictSaveAsCopy,
    resolveConflictCompare,
    closeConflictCompare,
  }
}

export function useProjectEditorUiActions({
  layoutState,
  projectState,
  uiState,
  sidebarState,
  setters,
  openProject,
  loadDocument,
  paneWorkspace,
}: UseProjectEditorUiActionsParams & { paneWorkspace: PaneWorkspace }): ProjectEditorActions {
  const primaryActions = usePrimaryProjectEditorActions(paneWorkspace, projectState, uiState, sidebarState, setters, openProject, loadDocument)
  const { selectedPath, editorValue, editorMeta, isDirty } = deriveActivePaneDocument(
    layoutState.workspaceLayout,
    paneWorkspace.primary,
    paneWorkspace.secondary,
  )
  const documentState = useMemo(() => ({
    selectedPath,
    editorValue,
    editorMeta,
    isDirty,
  }), [selectedPath, editorValue, editorMeta, isDirty])
  const conflictActions = useSecondaryProjectEditorActions(paneWorkspace, documentState, projectState, uiState, setters, openProject, loadDocument)
  return buildProjectEditorActions({ ...primaryActions, ...conflictActions })
}
