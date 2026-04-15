import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import { canSelectFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions, WorkspaceLayoutState, WorkspacePane } from './project-editor-types'
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
}

export function useAssignFileToActivePaneAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): (filePath: string) => void {
  return useCallback(
    (filePath: string) => {
      setters.setWorkspaceLayout((previous) => updatePathForPane(previous, values.workspaceLayout.activePane, filePath))
    },
    [setters, values.workspaceLayout.activePane],
  )
}

export function useAssignFileToPaneAction(
  setters: UseProjectEditorStateResult['setters'],
): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(
    (filePath: string, pane: WorkspacePane) => {
      setters.setWorkspaceLayout((previous) => updatePathForPane(previous, pane, filePath))
    },
    [setters],
  )
}

export function useToggleWorkspaceLayoutModeAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['toggleWorkspaceLayoutMode'] {
  return useCallback(() => {
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
  }, [setters, values.snapshot?.markdownFiles])
}

export function useSetWorkspaceLayoutRatioAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['setWorkspaceLayoutRatio'] {
  return useCallback(
    (ratio: number) => {
      setters.setWorkspaceLayout((previous) => ({
        ...previous,
        ratio,
      }))
    },
    [setters],
  )
}

export function useSetWorkspaceActivePaneAction({
  values,
  setters,
  loadDocument,
  saveDocumentNow,
}: UseSetWorkspaceActivePaneActionParams): ProjectEditorActions['setWorkspaceActivePane'] {
  return useCallback(
    async (pane: WorkspacePane) => {
      const activePaneState = values.workspaceLayout.activePane === 'secondary' ? values.secondaryPane : values.primaryPane
      if (activePaneState.isDirty && activePaneState.path) {
        await saveDocumentNow(activePaneState.path, activePaneState.content, activePaneState.meta)
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
    [loadDocument, saveDocumentNow, setters, values.primaryPane, values.secondaryPane, values.workspaceLayout.activePane, values.workspaceLayout.primaryPath, values.workspaceLayout.secondaryPath],
  )
}

export function useOpenFileInPaneAction({
  values,
  setters,
  loadDocument,
}: UseWorkspaceLayoutActionParams): (filePath: string, pane: WorkspacePane) => void {
  return useCallback(
    (filePath: string, pane: WorkspacePane) => {
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
    [loadDocument, setters, values.isDirty, values.selectedPath, values.primaryPane.path, values.workspaceLayout.secondaryPath],
  )
}
