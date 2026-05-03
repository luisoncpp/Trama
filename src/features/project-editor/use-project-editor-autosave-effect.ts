import { useEffect } from 'preact/hooks'
import type { WorkspacePane } from './project-editor-types'
import type { PaneWorkspace } from './pane'

interface UseProjectEditorAutosaveEffectParams {
  selectedPath: string | null
  isDirty: boolean
  activePane: WorkspacePane
  paneWorkspace: PaneWorkspace
}

export function useProjectEditorAutosaveEffect({
  selectedPath,
  isDirty,
  activePane,
  paneWorkspace,
}: UseProjectEditorAutosaveEffectParams): void {
  useEffect(/* autosaveOnDirty */ () => {
    if (!selectedPath || !isDirty) {
      paneWorkspace.cancelAutosave()
      return
    }

    paneWorkspace.scheduleAutosave(activePane, 10 * 1000)
  }, [selectedPath, isDirty, activePane, paneWorkspace] /*Inputs for autosaveOnDirty*/)
}
