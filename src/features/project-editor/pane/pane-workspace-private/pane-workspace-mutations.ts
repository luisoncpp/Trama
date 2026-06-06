import type { DocumentMeta } from '../../../../shared/ipc'
import type { RevisionRailState, WorkspacePane } from '../../project-editor-types'
import {
  buildExitedRevisionRailState,
  buildLoadedPaneDocumentState,
  buildUpdatedPaneContentState,
  createEmptyPaneRevisionRail,
} from '../pane-workspace-revision-state'
import type { PaneBindings } from '../pane-workspace-types'
import { updatePaneState } from './pane-workspace-bindings'
import type { PaneSnapshotTracker } from './pane-workspace-snapshot'

export function markPaneDirty(bindings: PaneBindings, pane: WorkspacePane): void {
  updatePaneState(pane, bindings, (prev) => (prev.isDirty ? prev : { ...prev, isDirty: true }))
}

export function updatePaneContent(bindings: PaneBindings, pane: WorkspacePane, content: string): void {
  updatePaneState(pane, bindings, (prev) => buildUpdatedPaneContentState(prev, content))
}

export function loadPaneDocument(
  bindings: PaneBindings,
  pane: WorkspacePane,
  path: string,
  content: string,
  meta: DocumentMeta,
): void {
  updatePaneState(pane, bindings, (prev) => buildLoadedPaneDocumentState(prev, path, content, meta))
}

export function clearPanes(bindings: PaneBindings): void {
  const empty = {
    path: null,
    content: '',
    meta: {},
    isDirty: false,
    reloadVersion: 0,
    revisionRail: createEmptyPaneRevisionRail(),
  }
  bindings.setPrimaryPane(empty)
  bindings.setSecondaryPane(empty)
}

export function updatePaneMeta(bindings: PaneBindings, path: string, meta: DocumentMeta): void {
  updatePaneState('primary', bindings, (prev) => (prev.path === path ? { ...prev, meta } : prev))
  updatePaneState('secondary', bindings, (prev) => (prev.path === path ? { ...prev, meta } : prev))
}

export function updatePaneMetaForPane(bindings: PaneBindings, pane: WorkspacePane, meta: DocumentMeta): void {
  updatePaneState(pane, bindings, (prev) => ({ ...prev, meta, isDirty: true }))
}

export function updateRevisionRail(
  bindings: PaneBindings,
  pane: WorkspacePane,
  updater: RevisionRailState | ((prev: RevisionRailState) => RevisionRailState),
): void {
  updatePaneState(pane, bindings, (prev) => ({
    ...prev,
    revisionRail: typeof updater === 'function' ? updater(prev.revisionRail) : updater,
  }))
}

export function exitRevisionPreview(bindings: PaneBindings, pane: WorkspacePane): void {
  updateRevisionRail(bindings, pane, buildExitedRevisionRailState)
}

export function markPaneSaved(
  bindings: PaneBindings,
  snapshotTracker: PaneSnapshotTracker,
  pane: WorkspacePane,
  path: string,
  content: string,
): void {
  snapshotTracker.set(path, content)
  updatePaneState(pane, bindings, (prev) => (prev.path === path ? { ...prev, isDirty: false } : prev))
}
