import type { PaneDocumentState, WorkspaceLayoutState, WorkspacePane } from '../project-editor-types'
import type { ActivePaneDocumentInfo, PaneDocumentInfo } from './pane-workspace-types'

export function buildPaneDocumentInfo(doc: PaneDocumentState): PaneDocumentInfo {
  return {
    path: doc.path,
    content: doc.content,
    isDirty: doc.isDirty,
    meta: doc.meta,
    reloadVersion: doc.reloadVersion,
    revisionRail: doc.revisionRail,
  }
}

export function buildActivePaneDocumentInfo(
  activePane: WorkspacePane,
  layoutState: WorkspaceLayoutState,
  pane: PaneDocumentState,
): ActivePaneDocumentInfo {
  return {
    ...buildPaneDocumentInfo(pane),
    selectedPath: activePane === 'secondary' ? layoutState.secondaryPath : layoutState.primaryPath,
    editorValue: pane.content,
    editorMeta: pane.meta,
  }
}
