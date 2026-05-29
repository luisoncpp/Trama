import type { PaneDocumentState, RevisionRailState } from '../project-editor-types'

export interface PaneDocumentInfo {
  path: string | null
  content: string
  isDirty: boolean
  meta: PaneDocumentState['meta']
  reloadVersion: number
  revisionRail: RevisionRailState
}

export interface ActivePaneDocumentInfo extends PaneDocumentInfo {
  selectedPath: string | null
  editorValue: string
  editorMeta: PaneDocumentState['meta']
}

export interface PaneBindings {
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  setPrimaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
  setSecondaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
}
