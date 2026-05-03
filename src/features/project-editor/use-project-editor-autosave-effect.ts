import { useEffect } from 'preact/hooks'
import type { WorkspacePane } from './project-editor-types'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'
import type { PaneWorkspace } from './pane-workspace'

interface UseProjectEditorAutosaveEffectParams {
  selectedPath: string | null
  isDirty: boolean
  activePane: WorkspacePane
  panePersistence: ProjectEditorPanePersistence
  paneWorkspace: PaneWorkspace
}

export function useProjectEditorAutosaveEffect({
  selectedPath,
  isDirty,
  activePane,
  panePersistence,
  paneWorkspace,
}: UseProjectEditorAutosaveEffectParams): void {
  useEffect(/* autosaveOnDirty */ () => {
    if (!selectedPath || !isDirty) {
      paneWorkspace.cancelAutosave()
      return
    }

    paneWorkspace.scheduleAutosave(
      activePane,
      () => panePersistence.savePaneIfDirty(activePane),
      10 * 60 * 1000,
    )
  }, [selectedPath, isDirty, activePane, panePersistence, paneWorkspace] /*Inputs for autosaveOnDirty*/)
}