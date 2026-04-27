import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import { canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { EditorSerializationRefs, ProjectEditorActions, WorkspaceLayoutState, WorkspacePane } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

function updatePathForPane(layout: WorkspaceLayoutState, pane: WorkspacePane, path: string): WorkspaceLayoutState {
  return pane === 'primary'
    ? { ...layout, primaryPath: path }
    : { ...layout, secondaryPath: path }
}

interface UseWorkspaceLayoutActionParams {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
}

interface UseSetWorkspaceActivePaneActionParams extends UseWorkspaceLayoutActionParams {
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function useAssignFileToActivePaneAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): (filePath: string) => void {
  return useCallback(/* assignFileToActivePaneAction */ (filePath: string) => {
      setters.setWorkspaceLayout((previous) => updatePathForPane(previous, values.workspaceLayout.activePane, filePath))
    },
    [setters, values.workspaceLayout.activePane] /*Inputs for assignFileToActivePaneAction*/)
}

export function useAssignFileToPaneAction(
  setters: UseProjectEditorStateResult['setters'],
): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(/* assignFileToPaneAction */ (filePath: string, pane: WorkspacePane) => {
      setters.setWorkspaceLayout((previous) => updatePathForPane(previous, pane, filePath))
    },
    [setters] /*Inputs for assignFileToPaneAction*/)
}

export function useToggleWorkspaceLayoutModeAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['toggleWorkspaceLayoutMode'] {
  return useCallback(/* toggleWorkspaceLayoutModeAction */ () => {
    setters.setWorkspaceLayout((previous) => {
      if (previous.mode === 'single') {
        const secondaryPath = previous.secondaryPath ?? values.snapshot?.markdownFiles.find((path) => path !== previous.primaryPath) ?? null
        return {
          ...previous,
          mode: secondaryPath ? 'split' : 'single',
          secondaryPath,
          activePane: 'primary',
        }
      }

      return {
        ...previous,
        mode: 'single',
        activePane: 'primary',
      }
    })
  }, [setters, values.snapshot?.markdownFiles] /*Inputs for toggleWorkspaceLayoutModeAction*/)
}

export function useSetWorkspaceLayoutRatioAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['setWorkspaceLayoutRatio'] {
  return useCallback(/* setWorkspaceLayoutRatioAction */ (ratio: number) => {
      setters.setWorkspaceLayout((previous) => ({
        ...previous,
        ratio,
      }))
    },
    [setters] /*Inputs for setWorkspaceLayoutRatioAction*/)
}

export function useSetWorkspaceActivePaneAction({
  values,
  setters,
  loadDocument,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: UseSetWorkspaceActivePaneActionParams): ProjectEditorActions['setWorkspaceActivePane'] {
  return useCallback(/* setWorkspaceActivePaneAction */ async (pane: WorkspacePane) => {
      const outgoingPane = values.workspaceLayout.activePane
      const outgoingState = outgoingPane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (outgoingState.isDirty && outgoingState.path) {
        const ref = outgoingPane === 'secondary' ? secondarySerializationRef : primarySerializationRef
        const latestContent = ref.current.flush() ?? outgoingState.content
        await saveDocumentNow(outgoingState.path, latestContent, outgoingState.meta)
      }

      const nextPath = pane === 'secondary' ? values.workspaceLayout.secondaryPath : values.workspaceLayout.primaryPath

      setters.setWorkspaceLayout((previous) => ({
        ...previous,
        activePane: pane,
      }))

      if (!nextPath) {
        setters.setConflictComparisonContent(null)
        setters.setStatusMessage(PROJECT_EDITOR_STRINGS.noFileSelected)
        return
      }

      const targetPaneState = pane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (targetPaneState.path !== nextPath) {
        void loadDocument(nextPath, pane)
      }
    },
    [
      loadDocument, saveDocumentNow, setters,
      values.primaryPane, values.secondaryPane,
      values.workspaceLayout.activePane,
      values.workspaceLayout.primaryPath,
      values.workspaceLayout.secondaryPath,
      primarySerializationRef, secondarySerializationRef,
    ] /*Inputs for setWorkspaceActivePaneAction*/)
}

export function useOpenFileInPaneAction({
  values,
  setters,
  loadDocument,
}: UseWorkspaceLayoutActionParams): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(/* openFileInPaneAction */ (filePath: string, pane: WorkspacePane) => {
      if (pane === 'secondary') {
        const currentSecondaryPath = values.workspaceLayout.secondaryPath
        const shouldLoad = currentSecondaryPath !== filePath

        setters.setWorkspaceLayout((previous) => ({
          ...previous,
          mode: previous.mode === 'single' ? 'split' : previous.mode,
          activePane: 'secondary',
          secondaryPath: filePath,
        }))

        if (shouldLoad) {
          void loadDocument(filePath, 'secondary')
        }
      } else {
        if (!canSelectFile(values.isDirty, values.selectedPath, filePath)) {
          setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
          return
        }

        setters.setWorkspaceLayout((previous) => ({
          ...previous,
          activePane: 'primary',
          primaryPath: filePath,
        }))

        if (values.primaryPane.path !== filePath) {
          void loadDocument(filePath, 'primary')
        }
      }
    },
    [loadDocument, setters, values.isDirty, values.selectedPath, values.primaryPane.path, values.workspaceLayout.secondaryPath] /*Inputs for openFileInPaneAction*/)
}
