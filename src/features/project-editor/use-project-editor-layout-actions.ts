import { useCallback } from 'preact/hooks'
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
}: UseWorkspaceLayoutActionParams): ProjectEditorActions['setWorkspaceActivePane'] {
  return useCallback(
    (pane: WorkspacePane) => {
      const nextPath = pane === 'secondary' ? values.workspaceLayout.secondaryPath : values.workspaceLayout.primaryPath
      if (!canSelectFile(values.isDirty, values.selectedPath, nextPath ?? '')) {
        setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
        return
      }

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
    [loadDocument, setters, values.isDirty, values.selectedPath, values.workspaceLayout.primaryPath, values.workspaceLayout.secondaryPath],
  )
}
