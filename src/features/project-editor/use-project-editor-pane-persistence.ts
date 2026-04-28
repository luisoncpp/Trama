import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { EditorSerializationRefs, PaneDocumentState, WorkspacePane } from './project-editor-types'
import type { ProjectEditorStateValues } from './use-project-editor-state'

export interface ProjectEditorPanePersistence {
  getSerializationRefForPane: (pane: WorkspacePane) => { current: EditorSerializationRefs }
  getPaneStateForPane: (pane: WorkspacePane) => PaneDocumentState
  flushPane: (pane: WorkspacePane) => string | null
  savePaneIfDirty: (pane: WorkspacePane) => Promise<void>
  saveAllDirtyPanes: () => Promise<void>
}

interface UseProjectEditorPanePersistenceParams {
  values: ProjectEditorStateValues
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function useProjectEditorPanePersistence({
  values,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: UseProjectEditorPanePersistenceParams): ProjectEditorPanePersistence {
  const getSerializationRefForPane = useCallback(/* getSerializationRefForPane */ (pane: WorkspacePane) => {
    return pane === 'secondary' ? secondarySerializationRef : primarySerializationRef
  }, [primarySerializationRef, secondarySerializationRef] /*Inputs for getSerializationRefForPane*/)

  const getPaneStateForPane = useCallback(/* getPaneStateForPane */ (pane: WorkspacePane) => {
    return pane === 'secondary' ? values.secondaryPane : values.primaryPane
  }, [values.primaryPane, values.secondaryPane] /*Inputs for getPaneStateForPane*/)

  const flushPane = useCallback(/* flushPane */ (pane: WorkspacePane) => {
    const ref = getSerializationRefForPane(pane)
    return ref.current.flush()
  }, [getSerializationRefForPane] /*Inputs for flushPane*/)

  const savePaneIfDirty = useCallback(/* savePaneIfDirty */ async (pane: WorkspacePane): Promise<void> => {
    const paneState = getPaneStateForPane(pane)
    if (!paneState.isDirty || !paneState.path) {
      return
    }

    const latestContent = flushPane(pane) ?? paneState.content
    await saveDocumentNow(paneState.path, latestContent, paneState.meta)
  }, [flushPane, getPaneStateForPane, saveDocumentNow] /*Inputs for savePaneIfDirty*/)

  const saveAllDirtyPanes = useCallback(/* saveAllDirtyPanes */ async (): Promise<void> => {
    await Promise.all((['primary', 'secondary'] as const).map((pane) => savePaneIfDirty(pane)))
  }, [savePaneIfDirty] /*Inputs for saveAllDirtyPanes*/)

  return {
    getSerializationRefForPane,
    getPaneStateForPane,
    flushPane,
    savePaneIfDirty,
    saveAllDirtyPanes,
  }
}
