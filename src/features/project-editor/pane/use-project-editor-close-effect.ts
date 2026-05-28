import { useEffect } from 'preact/hooks'
import type { PaneWorkspace } from './pane-workspace'

interface UseProjectEditorCloseEffectParams {
  paneWorkspace: PaneWorkspace
  primaryIsDirty: boolean
  secondaryIsDirty: boolean
}

export function useProjectEditorCloseEffect({
  paneWorkspace,
  primaryIsDirty,
  secondaryIsDirty,
}: UseProjectEditorCloseEffectParams): void {
  useEffect(/* notifyCloseStateDirtyFlag */ () => {
    const hasUnsavedChanges = primaryIsDirty || secondaryIsDirty
    if (window.tramaApi?.notifyCloseState) {
      void window.tramaApi.notifyCloseState({ hasUnsavedChanges })
    }
  }, [primaryIsDirty, secondaryIsDirty] /*Inputs for notifyCloseStateDirtyFlag*/)

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
