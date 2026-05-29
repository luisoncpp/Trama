import type { DocumentMeta } from '../../../shared/ipc'
import { createEmptyRevisionRailState } from '../project-editor-git-history-state'
import type { PaneDocumentState, RevisionRailState } from '../project-editor-types'
import { areEquivalentEditorValues } from './rich-markdown-editor/rich-markdown-editor-value-sync'

function computeCurrentRevisionLabel(
  path: string | null,
  content: string,
  latestRevisionValue: string | null,
): 'Current' | 'Current changes' {
  return path && areEquivalentEditorValues(content, latestRevisionValue ?? '', path)
    ? 'Current'
    : 'Current changes'
}

export function createEmptyPaneRevisionRail(): RevisionRailState {
  return createEmptyRevisionRailState()
}

export function buildUpdatedPaneContentState(prev: PaneDocumentState, content: string): PaneDocumentState {
  const nextRail = prev.revisionRail.documentPath === prev.path
    ? {
        ...prev.revisionRail,
        currentLabel: computeCurrentRevisionLabel(prev.path, content, prev.revisionRail.latestRevisionValue),
      }
    : prev.revisionRail
  return {
    ...prev,
    content,
    isDirty: true,
    revisionRail: nextRail,
  }
}

export function buildLoadedPaneDocumentState(
  prev: PaneDocumentState,
  path: string,
  content: string,
  meta: DocumentMeta,
): PaneDocumentState {
  const nextRail = prev.revisionRail.documentPath === path
    ? {
        ...prev.revisionRail,
        previewReadOnly: false,
        previewValue: null,
        previewVersion: prev.revisionRail.previewVersion + 1,
        selected: { kind: 'current' as const },
        currentLabel: computeCurrentRevisionLabel(prev.path, content, prev.revisionRail.latestRevisionValue),
        confirmation: { open: false, revision: null },
      }
    : createEmptyRevisionRailState()
  return {
    ...prev,
    path,
    content,
    meta,
    isDirty: false,
    reloadVersion: prev.reloadVersion + 1,
    revisionRail: nextRail,
  }
}

export function buildPreviewLoadedPaneState(prev: PaneDocumentState, content: string): PaneDocumentState {
  return {
    ...prev,
    content,
    isDirty: prev.isDirty,
    reloadVersion: prev.reloadVersion + 1,
  }
}

export function buildExitedRevisionRailState(prev: RevisionRailState): RevisionRailState {
  return {
    ...prev,
    previewReadOnly: false,
    previewValue: null,
    previewVersion: prev.previewVersion + 1,
    selected: { kind: 'current' },
    confirmation: { open: false, revision: null },
  }
}
