import { useEffect } from 'preact/hooks'
import type { PaneWorkspace } from './pane-workspace'

interface UseProjectEditorCloseEffectParams {
  paneWorkspace: PaneWorkspace
}

export function useProjectEditorCloseEffect({
  paneWorkspace,
}: UseProjectEditorCloseEffectParams): void {
  useEffect(/* notifyCloseStateDirtyFlag */ () => {
    const hasUnsavedChanges = paneWorkspace.isPaneDirty('primary') || paneWorkspace.isPaneDirty('secondary')
    if (window.tramaApi?.notifyCloseState) {
      void window.tramaApi.notifyCloseState({ hasUnsavedChanges })
    }
  }, [paneWorkspace] /*Inputs for notifyCloseStateDirtyFlag*/)

  useEffect(/* registerSaveAllGlobalHandler */ () => {
    const w = window as unknown as Record<string, unknown>

    w.__tramaSaveAll = async (): Promise<void> => {
      await paneWorkspace.saveAllDirtyPanes()
    }

    return () => {
      delete w.__tramaSaveAll
    }
  }, [paneWorkspace] /*Inputs for registerSaveAllGlobalHandler*/)
}
