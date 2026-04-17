import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
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
  useOpenFileInPaneAction,
  useSetWorkspaceActivePaneAction,
  useSetWorkspaceLayoutRatioAction,
  useToggleWorkspaceLayoutModeAction,
} from './use-project-editor-layout-actions'
import { useSetSidebarPanelWidthAction, useSetSidebarSectionAction, useToggleSidebarPanelCollapsedAction } from './use-project-editor-sidebar-actions'
import { useProjectEditorCreateActions } from './use-project-editor-create-actions'
import { useProjectEditorFileActions } from './use-project-editor-file-actions'
import { useProjectEditorFolderActions } from './use-project-editor-folder-actions'
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
  loadDocument,
  assignFileToActivePane,
  saveDocumentNow,
}: {
  values: UseProjectEditorStateResult['values']
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  assignFileToActivePane: (filePath: string) => void
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}): ProjectEditorActions['selectFile'] {
  return useCallback(
    async (filePath: string): Promise<void> => {
      if (values.isDirty && values.selectedPath) {
        await saveDocumentNow(values.selectedPath, values.editorValue, values.editorMeta)
      }

      assignFileToActivePane(filePath)
      if (filePath !== values.selectedPath) {
        void loadDocument(filePath, values.workspaceLayout.activePane)
      }
    },
    [assignFileToActivePane, loadDocument, saveDocumentNow, values.editorMeta, values.editorValue, values.isDirty, values.selectedPath],
  )
}
function useUpdateEditorValueAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['updateEditorValue'] {
  return useCallback(
    (nextValue: string, pane?: WorkspacePane) => {
      const targetPane = pane ?? values.workspaceLayout.activePane
      if (targetPane === 'secondary') {
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
  return useCallback((pane?: WorkspacePane) => {
    const targetPane = pane ?? values.workspaceLayout.activePane
    const paneState = targetPane === 'secondary' ? values.secondaryPane : values.primaryPane

    if (!paneState.path || values.saving || !paneState.isDirty) {
      return
    }

    void saveDocumentNow(paneState.path, paneState.content, paneState.meta)
  }, [saveDocumentNow, values.primaryPane, values.saving, values.secondaryPane, values.workspaceLayout.activePane])
}
function buildProjectEditorActions(input: ProjectEditorActions): ProjectEditorActions {
  return input
}
function useReorderFilesAction({
  setters,
}: {
  setters: UseProjectEditorStateResult['setters']
}): ProjectEditorActions['reorderFiles'] {
  return useCallback(
    async (folderPath: string, orderedIds: string[]): Promise<void> => {
      try {
        const response = await window.tramaApi.reorderFiles({ folderPath, orderedIds })
        if (!response.ok) {
          setters.setStatusMessage(`Could not reorder files: ${response.error.message}`)
          return
        }
        setters.setStatusMessage(`File order updated for folder: ${folderPath || '(root)'}`)
      } catch (error) {
        setters.setStatusMessage(`Error reordering files: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [setters],
  )
}

function usePrimaryProjectEditorActions(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
  openProject: UseProjectEditorUiActionsParams['openProject'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
  saveDocumentNow: UseProjectEditorUiActionsParams['saveDocumentNow'],
) {
  const assignFileToActivePane = useAssignFileToActivePaneAction(values, setters)
  const openFileInPane = useOpenFileInPaneAction({ values, setters, loadDocument })
  const pickProjectFolder = usePickProjectFolderAction({ openProject, setters })
  const selectFile = useSelectFileAction({ values, loadDocument, assignFileToActivePane, saveDocumentNow })
  const { createArticle, createCategory } = useProjectEditorCreateActions({ values, setters, openProject })
  const { renameFile, deleteFile, editFileTags } = useProjectEditorFileActions({ values, setters, openProject })
  const { renameFolder, deleteFolder } = useProjectEditorFolderActions({ values, setters, openProject })
  const reorderFiles = useReorderFilesAction({ setters })
  const setSidebarSection = useSetSidebarSectionAction(setters)
  const toggleSidebarPanelCollapsed = useToggleSidebarPanelCollapsedAction(values, setters)
  const setSidebarPanelWidth = useSetSidebarPanelWidthAction(setters)
  const toggleWorkspaceLayoutMode = useToggleWorkspaceLayoutModeAction(values, setters)
  const setWorkspaceLayoutRatio = useSetWorkspaceLayoutRatioAction(setters)
  const setWorkspaceActivePane = useSetWorkspaceActivePaneAction({ values, setters, loadDocument, saveDocumentNow })
  const updateEditorValue = useUpdateEditorValueAction(values, setters)
  const saveNow = useSaveNowAction({ values, saveDocumentNow })
  const setFullscreenEnabled = useSetFullscreenEnabledAction(setters)
  const toggleFocusMode = useToggleFocusModeAction(values, setters)
  const setFocusScope = useSetFocusScopeAction(setters)

  return {
    pickProjectFolder,
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
