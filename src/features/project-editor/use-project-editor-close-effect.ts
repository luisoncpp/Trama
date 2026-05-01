import { useEffect } from 'preact/hooks'
import type { ProjectEditorPaneState } from './project-editor-types'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'

interface UseProjectEditorCloseEffectParams {
  paneState: ProjectEditorPaneState
  panePersistence: ProjectEditorPanePersistence
}

export function useProjectEditorCloseEffect({
  paneState,
  panePersistence,
}: UseProjectEditorCloseEffectParams): void {
  useEffect(/* notifyCloseStateDirtyFlag */ () => {
    const hasUnsavedChanges = paneState.primaryPane.isDirty || paneState.secondaryPane.isDirty
    if (window.tramaApi?.notifyCloseState) {
      void window.tramaApi.notifyCloseState({ hasUnsavedChanges })
    }
  }, [paneState.primaryPane.isDirty, paneState.secondaryPane.isDirty] /*Inputs for notifyCloseStateDirtyFlag*/)

  useEffect(/* registerSaveAllGlobalHandler */ () => {
    const w = window as unknown as Record<string, unknown>

    w.__tramaSaveAll = async (): Promise<void> => {
      await panePersistence.saveAllDirtyPanes()
    }

    return () => {
      delete w.__tramaSaveAll
    }
  }, [panePersistence, paneState.primaryPane, paneState.secondaryPane] /*Inputs for registerSaveAllGlobalHandler*/)
}
