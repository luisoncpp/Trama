import type { ProjectEditorActions } from './project-editor-types'
import type { EditorSerializationRefs } from './project-editor-types'
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
import type { UseProjectEditorStateResult } from './use-project-editor-state'
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
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
  openProject: UseProjectEditorUiActionsParams['openProject'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
  saveDocumentNow: UseProjectEditorUiActionsParams['saveDocumentNow'],
  primarySerializationRef: { current: EditorSerializationRefs },
  secondarySerializationRef: { current: EditorSerializationRefs },
) {
  const assignFileToActivePane = useAssignFileToActivePaneAction(values, setters)
  const openFileInPane = useOpenFileInPaneAction({ values, setters, loadDocument })
  const selectFile = useSelectFileAction({ values, loadDocument, assignFileToActivePane, saveDocumentNow, primarySerializationRef, secondarySerializationRef })
  const { createArticle, createCategory } = useProjectEditorCreateActions({ values, setters, openProject })
  const { renameFile, deleteFile, editFileTags } = useProjectEditorFileActions({ values, setters, openProject })
  const { renameFolder, deleteFolder, moveFolder } = useProjectEditorFolderActions({ values, setters, openProject })
  const sidebarActions = useSidebarActions(values, setters)
  const layoutActions = useWorkspaceLayoutActions(values, setters, loadDocument, saveDocumentNow, primarySerializationRef, secondarySerializationRef)
  const editorViewActions = useEditorViewActions(values, setters, saveDocumentNow, primarySerializationRef, secondarySerializationRef)
  const projectPickerActions = useProjectPickerActions({ openProject, setters })
  const reorderFiles = useReorderFilesAction({ setters, openProject, rootPath: values.rootPath })
  const moveFile = useMoveFileAction({ values, setters, openProject })

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
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
  openProject: UseProjectEditorUiActionsParams['openProject'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
) {
  const resolveConflictReload = useResolveConflictReloadAction({ values, setters, loadDocument })
  const resolveConflictKeep = useResolveConflictKeepAction(setters)
  const resolveConflictSaveAsCopy = useResolveConflictSaveAsCopyAction({ values, setters, openProject })
  const resolveConflictCompare = useResolveConflictCompareAction({ values, setters })
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
  values,
  setters,
  openProject,
  loadDocument,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: UseProjectEditorUiActionsParams): ProjectEditorActions {
  const primaryActions = usePrimaryProjectEditorActions(values, setters, openProject, loadDocument, saveDocumentNow, primarySerializationRef, secondarySerializationRef)
  const conflictActions = useSecondaryProjectEditorActions(values, setters, openProject, loadDocument)
  return buildProjectEditorActions({ ...primaryActions, ...conflictActions })
}
