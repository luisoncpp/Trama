import { useEffect } from 'preact/hooks'
import type { PaneDocumentState } from './project-editor-types'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'

interface UseProjectEditorCloseEffectParams {
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  panePersistence: ProjectEditorPanePersistence
}

export function useProjectEditorCloseEffect({
  primaryPane,
  secondaryPane,
  panePersistence,
}: UseProjectEditorCloseEffectParams): void {
  useEffect(/* notifyCloseStateDirtyFlag */ () => {
    const hasUnsavedChanges = primaryPane.isDirty || secondaryPane.isDirty
    if (window.tramaApi?.notifyCloseState) {
      void window.tramaApi.notifyCloseState({ hasUnsavedChanges })
    }
  }, [primaryPane.isDirty, secondaryPane.isDirty] /*Inputs for notifyCloseStateDirtyFlag*/)

  useEffect(/* registerSaveAllGlobalHandler */ () => {
    const w = window as unknown as Record<string, unknown>

    w.__tramaSaveAll = async (): Promise<void> => {
      await panePersistence.saveAllDirtyPanes()
    }

    return () => {
      delete w.__tramaSaveAll
    }
  }, [panePersistence, primaryPane, secondaryPane] /*Inputs for registerSaveAllGlobalHandler*/)
}
