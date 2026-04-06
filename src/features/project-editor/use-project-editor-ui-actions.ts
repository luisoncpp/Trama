import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import { canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions } from './project-editor-types'
import {
  useCloseConflictCompareAction,
  useResolveConflictCompareAction,
  useResolveConflictKeepAction,
  useResolveConflictReloadAction,
  useResolveConflictSaveAsCopyAction,
} from './use-project-editor-conflict-actions'
import {
  useAssignFileToActivePaneAction,
  useSetWorkspaceActivePaneAction,
  useSetWorkspaceLayoutRatioAction,
  useToggleWorkspaceLayoutModeAction,
} from './use-project-editor-layout-actions'
import { useSetSidebarPanelWidthAction, useSetSidebarSectionAction, useToggleSidebarPanelCollapsedAction } from './use-project-editor-sidebar-actions'
import { useProjectEditorCreateActions } from './use-project-editor-create-actions'
import { useProjectEditorFileActions } from './use-project-editor-file-actions'
import {
  useSetFocusScopeAction,
  useSetFullscreenEnabledAction,
  useToggleFocusModeAction,
} from './use-project-editor-focus-actions'
import type { UseProjectEditorStateResult } from './use-project-editor-state'
import type { WorkspacePane } from './project-editor-types'
interface UseProjectEditorUiActionsParams { values: UseProjectEditorStateResult['values']; setters: UseProjectEditorStateResult['setters']; openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>; loadDocument: (path: string, pane: WorkspacePane) => Promise<void>; saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void> }

function usePickProjectFolderAction({
  openProject,
  setters,
}: {
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setters: UseProjectEditorStateResult['setters']
}): ProjectEditorActions['pickProjectFolder'] {
  return useCallback(async (): Promise<void> => {
    const selected = await window.tramaApi.selectProjectFolder()
    if (!selected.ok) {
      setters.setStatusMessage(`Could not open folder picker: ${selected.error.message}`)
      return
    }

    if (!selected.data.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.folderSelectionCanceled)
      return
    }

    await openProject(selected.data.rootPath)
  }, [openProject, setters])
}
function useSelectFileAction({
  values,
  setters,
  loadDocument,
  assignFileToActivePane,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  assignFileToActivePane: (filePath: string) => void
}): ProjectEditorActions['selectFile'] {
  return useCallback(
    (filePath: string) => {
      if (!canSelectFile(values.isDirty, values.selectedPath, filePath)) {
        setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
        return
      }

      assignFileToActivePane(filePath)
      void loadDocument(filePath, values.workspaceLayout.activePane)
    },
    [assignFileToActivePane, loadDocument, setters, values.isDirty, values.selectedPath],
  )
}
function useUpdateEditorValueAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['updateEditorValue'] {
  return useCallback(
    (nextValue: string) => {
      if (values.workspaceLayout.activePane === 'secondary') {
        setters.setSecondaryPane((prev) => ({ ...prev, content: nextValue, isDirty: true }))
      } else {
        setters.setPrimaryPane((prev) => ({ ...prev, content: nextValue, isDirty: true }))
      }
    },
    [setters, values.workspaceLayout.activePane],
  )
}
function useSaveNowAction({
  values,
  saveDocumentNow,
}: {
  values: UseProjectEditorStateResult['values']
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}): ProjectEditorActions['saveNow'] {
  return useCallback(() => {
    if (!values.selectedPath || values.saving || !values.isDirty) {
      return
    }

    void saveDocumentNow(values.selectedPath, values.editorValue, values.editorMeta)
  }, [saveDocumentNow, values.editorMeta, values.editorValue, values.isDirty, values.saving, values.selectedPath])
}
function buildProjectEditorActions(input: ProjectEditorActions): ProjectEditorActions {
  return input
}
function usePrimaryProjectEditorActions(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
  openProject: UseProjectEditorUiActionsParams['openProject'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
  saveDocumentNow: UseProjectEditorUiActionsParams['saveDocumentNow'],
) {
  const assignFileToActivePane = useAssignFileToActivePaneAction(values, setters)
  const pickProjectFolder = usePickProjectFolderAction({ openProject, setters })
  const selectFile = useSelectFileAction({ values, setters, loadDocument, assignFileToActivePane })
  const { createArticle, createCategory } = useProjectEditorCreateActions({ values, setters, openProject })
  const { renameFile, deleteFile } = useProjectEditorFileActions({ values, setters, openProject })
  const setSidebarSection = useSetSidebarSectionAction(setters)
  const toggleSidebarPanelCollapsed = useToggleSidebarPanelCollapsedAction(values, setters)
  const setSidebarPanelWidth = useSetSidebarPanelWidthAction(setters)
  const toggleWorkspaceLayoutMode = useToggleWorkspaceLayoutModeAction(values, setters)
  const setWorkspaceLayoutRatio = useSetWorkspaceLayoutRatioAction(setters)
  const setWorkspaceActivePane = useSetWorkspaceActivePaneAction({ values, setters, loadDocument })
  const updateEditorValue = useUpdateEditorValueAction(values, setters)
  const saveNow = useSaveNowAction({ values, saveDocumentNow })
  const setFullscreenEnabled = useSetFullscreenEnabledAction(setters)
  const toggleFocusMode = useToggleFocusModeAction(values, setters)
  const setFocusScope = useSetFocusScopeAction(setters)

  return {
    pickProjectFolder,
    selectFile,
    createArticle,
    createCategory,
    renameFile,
    deleteFile,
    setSidebarSection,
    toggleSidebarPanelCollapsed,
    setSidebarPanelWidth,
    toggleWorkspaceLayoutMode,
    setWorkspaceLayoutRatio,
    setWorkspaceActivePane,
    setFullscreenEnabled,
    toggleFocusMode,
    setFocusScope,
    updateEditorValue,
    saveNow,
  }
}
function useConflictProjectEditorActions(
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
}: UseProjectEditorUiActionsParams): ProjectEditorActions {
  const primaryActions = usePrimaryProjectEditorActions(values, setters, openProject, loadDocument, saveDocumentNow)
  const conflictActions = useConflictProjectEditorActions(values, setters, openProject, loadDocument)
  return buildProjectEditorActions({ ...primaryActions, ...conflictActions })
}
