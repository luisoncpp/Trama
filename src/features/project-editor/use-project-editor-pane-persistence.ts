import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { EditorSerializationRefs, WorkspacePane } from './project-editor-types'
import type { ProjectEditorPaneState } from './project-editor-types'

export interface ProjectEditorPanePersistence {
  getSerializationRefForPane: (pane: WorkspacePane) => { current: EditorSerializationRefs }
  getPaneStateForPane: (pane: WorkspacePane) => { path: string | null; content: string; meta: DocumentMeta; isDirty: boolean }
  flushPane: (pane: WorkspacePane) => string | null
  savePaneIfDirty: (pane: WorkspacePane) => Promise<void>
  saveAllDirtyPanes: () => Promise<void>
}

interface UseProjectEditorPanePersistenceParams {
  paneState: ProjectEditorPaneState
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function useProjectEditorPanePersistence({
  paneState,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: UseProjectEditorPanePersistenceParams): ProjectEditorPanePersistence {
  const getSerializationRefForPane = useCallback(/* getSerializationRefForPane */ (pane: WorkspacePane) => {
    return pane === 'secondary' ? secondarySerializationRef : primarySerializationRef
  }, [primarySerializationRef, secondarySerializationRef] /*Inputs for getSerializationRefForPane*/)

  const getPaneStateForPane = useCallback(/* getPaneStateForPane */ (pane: WorkspacePane) => {
    return pane === 'secondary' ? paneState.secondaryPane : paneState.primaryPane
  }, [paneState.primaryPane, paneState.secondaryPane] /*Inputs for getPaneStateForPane*/)

  const flushPane = useCallback(/* flushPane */ (pane: WorkspacePane) => {
    const ref = getSerializationRefForPane(pane)
    return ref.current.flush()
  }, [getSerializationRefForPane] /*Inputs for flushPane*/)

  const savePaneIfDirty = useCallback(/* savePaneIfDirty */ async (pane: WorkspacePane): Promise<void> => {
    const paneStateLocal = getPaneStateForPane(pane)
    if (!paneStateLocal.isDirty || !paneStateLocal.path) {
      return
    }

    const latestContent = flushPane(pane) ?? paneStateLocal.content
    await saveDocumentNow(paneStateLocal.path, latestContent, paneStateLocal.meta)
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
