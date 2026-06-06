import type { EditorSerializationRefs, PaneDocumentState, WorkspacePane } from '../../project-editor-types'
import type { PaneBindings } from '../pane-workspace-types'

export type PaneSerializationRefs = {
  primary: { current: EditorSerializationRefs }
  secondary: { current: EditorSerializationRefs }
}

export function getSerializationRefForPane(pane: WorkspacePane, refs: PaneSerializationRefs) {
  return pane === 'secondary' ? refs.secondary : refs.primary
}

export function getPaneState(pane: WorkspacePane, bindings: PaneBindings): PaneDocumentState {
  return pane === 'secondary' ? bindings.secondaryPane : bindings.primaryPane
}

export function updatePaneState(
  pane: WorkspacePane,
  bindings: PaneBindings,
  updater: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState),
): void {
  if (pane === 'secondary') {
    bindings.setSecondaryPane(updater)
    return
  }
  bindings.setPrimaryPane(updater)
}
