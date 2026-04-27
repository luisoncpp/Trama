import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { EditorSerializationRefs, ProjectEditorActions } from './project-editor-types'
import { useSetSidebarPanelWidthAction, useSetSidebarSectionAction, useToggleSidebarPanelCollapsedAction } from './use-project-editor-sidebar-actions'
import { useSetFocusScopeAction, useSetFullscreenEnabledAction, useToggleFocusModeAction } from './use-project-editor-focus-actions'
import {
  useSetWorkspaceActivePaneAction,
  useSetWorkspaceLayoutRatioAction,
  useToggleWorkspaceLayoutModeAction,
} from './use-project-editor-layout-actions'
import type { UseProjectEditorStateResult } from './use-project-editor-state'
import type { WorkspacePane } from './project-editor-types'

export interface UseProjectEditorUiActionsParams {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function usePickProjectFolderAction({
  openProject,
  setters,
}: {
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setters: UseProjectEditorStateResult['setters']
}): ProjectEditorActions['pickProjectFolder'] {
  return useCallback(/* pickProjectFolderAction */ async (): Promise<void> => {
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
  }, [openProject, setters] /*Inputs for pickProjectFolderAction*/)
}

export function useSelectFileAction({
  values,
  loadDocument,
  assignFileToActivePane,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: {
  values: UseProjectEditorStateResult['values']
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  assignFileToActivePane: (filePath: string) => void
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}): ProjectEditorActions['selectFile'] {
  return useCallback(/* selectFileAction */ async (filePath: string): Promise<void> => {
      // Flush pending edits for the active pane so dirty-check sees latest content
      const activePane = values.workspaceLayout.activePane
      const ref = activePane === 'secondary' ? secondarySerializationRef : primarySerializationRef
      const flushedContent = ref.current.flush()

      const activePaneState = activePane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (activePaneState.isDirty && activePaneState.path) {
        const contentToSave = flushedContent ?? activePaneState.content
        await saveDocumentNow(activePaneState.path, contentToSave, activePaneState.meta)
      }

      assignFileToActivePane(filePath)
      if (filePath !== activePaneState.path) {
        void loadDocument(filePath, activePane)
      }
    }, [
      assignFileToActivePane, loadDocument, saveDocumentNow,
      values.editorMeta, values.editorValue, values.isDirty,
      values.selectedPath,
      primarySerializationRef, secondarySerializationRef,
    ] /*Inputs for selectFileAction*/)
}

export function useReorderFilesAction({
  setters,
  openProject,
  rootPath,
}: {
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string) => Promise<void>
  rootPath: string
}): ProjectEditorActions['reorderFiles'] {
  return useCallback(/* reorderFilesAction */ async (folderPath: string, orderedIds: string[]): Promise<void> => {
      try {
        const response = await window.tramaApi.reorderFiles({ folderPath, orderedIds })
        if (!response.ok) {
          setters.setStatusMessage(`Could not reorder files: ${response.error.message}`)
          return
        }
        setters.setStatusMessage(`File order updated for folder: ${folderPath || '(root)'}`)
        await openProject(rootPath)
      } catch (error) {
        setters.setStatusMessage(`Error reordering files: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [openProject, rootPath, setters] /*Inputs for reorderFilesAction*/)
}

export function useMoveFileAction({
  values,
  setters,
  openProject,
}: {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
}): ProjectEditorActions['moveFile'] {
  return useCallback(/* moveFileAction */ async (sourcePath: string, targetFolder: string): Promise<void> => {
      if (!values.rootPath) {
        setters.setStatusMessage('No project is open')
        return
      }

      const isSourceDirty =
        (values.primaryPane.path === sourcePath && values.primaryPane.isDirty) ||
        (values.secondaryPane.path === sourcePath && values.secondaryPane.isDirty)
      if (isSourceDirty) {
        setters.setStatusMessage('Save the file before moving it.')
        return
      }

      try {
        const response = await window.tramaApi.moveFile({ sourcePath, targetFolder })
        if (!response.ok) {
          setters.setStatusMessage(`Could not move file: ${response.error.message}`)
          return
        }

        setters.setStatusMessage(`Moved file to: ${response.data.renamedTo}`)
        await openProject(values.rootPath, response.data.renamedTo)
      } catch (error) {
        setters.setStatusMessage(`Error moving file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [openProject, setters, values.primaryPane.isDirty, values.primaryPane.path, values.rootPath, values.secondaryPane.isDirty, values.secondaryPane.path] /*Inputs for moveFileAction*/)
}

export function useSidebarActions(values: UseProjectEditorStateResult['values'], setters: UseProjectEditorStateResult['setters']) {
  return {
    setSidebarSection: useSetSidebarSectionAction(setters),
    toggleSidebarPanelCollapsed: useToggleSidebarPanelCollapsedAction(values, setters),
    setSidebarPanelWidth: useSetSidebarPanelWidthAction(setters),
  }
}

export function useWorkspaceLayoutActions(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
  loadDocument: UseProjectEditorUiActionsParams['loadDocument'],
  saveDocumentNow: UseProjectEditorUiActionsParams['saveDocumentNow'],
  primarySerializationRef: { current: EditorSerializationRefs },
  secondarySerializationRef: { current: EditorSerializationRefs },
) {
  return {
    toggleWorkspaceLayoutMode: useToggleWorkspaceLayoutModeAction(values, setters),
    setWorkspaceLayoutRatio: useSetWorkspaceLayoutRatioAction(setters),
    setWorkspaceActivePane: useSetWorkspaceActivePaneAction({ values, setters, loadDocument, saveDocumentNow, primarySerializationRef, secondarySerializationRef }),
  }
}

export function useEditorViewActions(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
  saveDocumentNow: UseProjectEditorUiActionsParams['saveDocumentNow'],
  primarySerializationRef: { current: EditorSerializationRefs },
  secondarySerializationRef: { current: EditorSerializationRefs },
) {
  return {
    updateEditorValue: (nextValue: string, pane?: WorkspacePane) => {
      const targetPane = pane ?? values.workspaceLayout.activePane
      if (targetPane === 'secondary') {
        setters.setSecondaryPane((prev) => ({ ...prev, content: nextValue, isDirty: true }))
      } else {
        setters.setPrimaryPane((prev) => ({ ...prev, content: nextValue, isDirty: true }))
      }
    },
    saveNow: (pane?: WorkspacePane) => {
      const targetPane = pane ?? values.workspaceLayout.activePane
      const paneState = targetPane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (!paneState.path || values.saving || !paneState.isDirty) {
        return
      }
      // Flush and use the returned content directly — do NOT read paneState.content
      // because React state updates are batched and the content is stale at this point.
      const ref = targetPane === 'secondary' ? secondarySerializationRef : primarySerializationRef
      const latestContent = ref.current.flush() ?? paneState.content
      void saveDocumentNow(paneState.path, latestContent, paneState.meta)
    },
    setFullscreenEnabled: useSetFullscreenEnabledAction(setters),
    toggleFocusMode: useToggleFocusModeAction(values, setters),
    setFocusScope: useSetFocusScopeAction(setters),
  }
}

export function useProjectPickerActions({
  openProject,
  setters,
}: {
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setters: UseProjectEditorStateResult['setters']
}) {
  return { pickProjectFolder: usePickProjectFolderAction({ openProject, setters }) }
}
