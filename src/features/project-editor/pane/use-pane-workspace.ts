import { useMemo } from 'preact/hooks'
import type { DocumentMeta } from '../../../shared/ipc'
import type {
  EditorSerializationRefs,
  PaneDocumentState,
  PaneNavigationHistoryStore,
  WorkspaceLayoutState,
} from '../project-editor-types'
import { PaneWorkspace } from './pane-workspace'

export function usePaneWorkspace(
  layoutState: WorkspaceLayoutState,
  paneBindings: {
    primaryPane: PaneDocumentState
    secondaryPane: PaneDocumentState
    setPrimaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
    setSecondaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
  },
  serializationRefs: {
    primary: { current: EditorSerializationRefs }
    secondary: { current: EditorSerializationRefs }
  },
  saveDocumentFn: (
    path: string,
    content: string,
    meta: DocumentMeta
  ) => Promise<void>,
  navigationHistory: PaneNavigationHistoryStore,
  savedContentMap?: Map<string, string>,
): PaneWorkspace {
  return useMemo(
    () => new PaneWorkspace(layoutState, paneBindings, serializationRefs, saveDocumentFn, navigationHistory, savedContentMap),
    [layoutState, paneBindings, serializationRefs, saveDocumentFn, navigationHistory, savedContentMap],
  )
}
