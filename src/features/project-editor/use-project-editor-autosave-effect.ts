import { useEffect } from 'preact/hooks'
import type { WorkspacePane } from './project-editor-types'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'

interface UseProjectEditorAutosaveEffectParams {
  selectedPath: string | null
  isDirty: boolean
  activePane: WorkspacePane
  panePersistence: ProjectEditorPanePersistence
}

export function useProjectEditorAutosaveEffect({
  selectedPath,
  isDirty,
  activePane,
  panePersistence,
}: UseProjectEditorAutosaveEffectParams): void {
  useEffect(/* autosaveOnDirty */ () => {
    if (!selectedPath || !isDirty) {
      return
    }

    const timer = window.setTimeout(() => {
      void panePersistence.savePaneIfDirty(activePane)
    }, /*timeout*/ 10 * 60 * 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [selectedPath, isDirty, activePane, panePersistence] /*Inputs for autosaveOnDirty*/)
}
