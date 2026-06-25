// @Architecture(descriptionShort="Private implementation detail for parent module")
import type { EditorSession, PaneDocumentState, WorkspacePane } from '../../project-editor-types'
import type { PaneBindings } from '../pane-workspace-types'

export type PaneEditorSessionRefs = {
  primary: { current: EditorSession | null }
  secondary: { current: EditorSession | null }
}

export function getEditorSessionRefForPane(pane: WorkspacePane, refs: PaneEditorSessionRefs) {
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
