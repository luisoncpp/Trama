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
  ProjectEditorLayoutState,
  ProjectEditorPaneState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
} from './project-editor-types'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'
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
  layoutState: ProjectEditorLayoutState,
  paneState: ProjectEditorPaneState,
  projectState: ProjectEditorProjectState,
  uiState: ProjectEditorUiState,
  sidebarState: ProjectEditorSidebarState,
  setters: UseProjectEditorUiActionsParams['setters'],
  openProject: UseProjectEditorUiActionsParams['openProject'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
  panePersistence: ProjectEditorPanePersistence,
) {
  const assignFileToActivePane = useAssignFileToActivePaneAction(layoutState, setters)
  const openFileInPane = useOpenFileInPaneAction({ layoutState, paneState, projectState, setters, loadDocument, panePersistence })
  const selectFile = useSelectFileAction({ layoutState, loadDocument, assignFileToActivePane, panePersistence })
  const { createArticle, createCategory } = useProjectEditorCreateActions({ projectState, sidebarState, setters, openProject })
  const { renameFile, deleteFile, editFileTags } = useProjectEditorFileActions({ paneState, projectState, setters, openProject })
  const { renameFolder, deleteFolder, moveFolder } = useProjectEditorFolderActions({ layoutState, paneState, projectState, setters, openProject })
  const sidebarActions = useSidebarActions(layoutState, sidebarState, setters)
  const layoutActions = useWorkspaceLayoutActions(layoutState, paneState, projectState, setters, loadDocument, panePersistence)
  const editorViewActions = useEditorViewActions(layoutState, uiState, setters, panePersistence)
  const projectPickerActions = useProjectPickerActions({ openProject, setters })
  const reorderFiles = useReorderFilesAction({ setters, openProject, rootPath: projectState.rootPath })
  const moveFile = useMoveFileAction({ paneState, projectState, setters, openProject })

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
  layoutState: ProjectEditorLayoutState,
  documentState: { selectedPath: string | null; editorValue: string; editorMeta: any; isDirty: boolean },
  projectState: ProjectEditorProjectState,
  uiState: ProjectEditorUiState,
  setters: UseProjectEditorUiActionsParams['setters'],
  openProject: UseProjectEditorUiActionsParams['openProject'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
) {
  const resolveConflictReload = useResolveConflictReloadAction({ layoutState, uiState, setters, loadDocument })
  const resolveConflictKeep = useResolveConflictKeepAction(setters)
  const resolveConflictSaveAsCopy = useResolveConflictSaveAsCopyAction({ documentState, projectState, layoutState, setters, openProject })
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
  paneState,
  projectState,
  uiState,
  sidebarState,
  setters,
  openProject,
  loadDocument,
  panePersistence,
}: UseProjectEditorUiActionsParams): ProjectEditorActions {
  const primaryActions = usePrimaryProjectEditorActions(layoutState, paneState, projectState, uiState, sidebarState, setters, openProject, loadDocument, panePersistence)
  const { selectedPath, editorValue, editorMeta, isDirty } = deriveActivePaneDocument(
    layoutState.workspaceLayout,
    paneState.primaryPane,
    paneState.secondaryPane,
  )
  const documentState = useMemo(() => ({
    selectedPath,
    editorValue,
    editorMeta,
    isDirty,
  }), [selectedPath, editorValue, editorMeta, isDirty])
  const conflictActions = useSecondaryProjectEditorActions(layoutState, documentState, projectState, uiState, setters, openProject, loadDocument)
  return buildProjectEditorActions({ ...primaryActions, ...conflictActions })
}
