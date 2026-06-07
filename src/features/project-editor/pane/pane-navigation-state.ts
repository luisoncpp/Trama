import type {
  PaneNavigationHistoryState,
  PaneNavigationHistoryStore,
  WorkspacePane,
} from '../project-editor-types'

export function getEmptyNavigationHistory(): PaneNavigationHistoryState {
  return { entries: [], index: -1 }
}

export function getHistoryForPane(
  historyStore: PaneNavigationHistoryStore,
  pane: WorkspacePane,
): PaneNavigationHistoryState {
  return pane === 'secondary' ? historyStore.secondary : historyStore.primary
}

export function createNavigationHistoryStore(): PaneNavigationHistoryStore {
  return {
    primary: getEmptyNavigationHistory(),
    secondary: getEmptyNavigationHistory(),
  }
}
