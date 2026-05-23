import {
  getEmptyNavigationHistory,
  getHistoryForPane,
} from './pane-navigation-state'
import type { PaneNavigationHistoryStore, WorkspacePane } from '../project-editor-types'

export class PaneNavigation {
  constructor(private store: PaneNavigationHistoryStore) {}

  getPaneNavigationHistory(pane: WorkspacePane) {
    const history = getHistoryForPane(this.store, pane)
    return { entries: [...history.entries], index: history.index }
  }

  recordPaneNavigation(pane: WorkspacePane, path: string): void {
    const history = getHistoryForPane(this.store, pane)
    if (history.index >= 0 && history.entries[history.index] === path) return
    history.entries = history.entries.slice(0, history.index + 1)
    history.entries.push(path)
    history.index = history.entries.length - 1
  }

  getPreviousPathInPaneHistory(pane: WorkspacePane): string | null {
    const history = getHistoryForPane(this.store, pane)
    if (history.index <= 0) return null
    return history.entries[history.index - 1] ?? null
  }

  getNextPathInPaneHistory(pane: WorkspacePane): string | null {
    const history = getHistoryForPane(this.store, pane)
    if (history.index < 0 || history.index >= history.entries.length - 1) return null
    return history.entries[history.index + 1] ?? null
  }

  stepPaneNavigationHistory(pane: WorkspacePane, direction: -1 | 1): string | null {
    const history = getHistoryForPane(this.store, pane)
    const nextIndex = history.index + direction
    if (nextIndex < 0 || nextIndex >= history.entries.length) return null
    history.index = nextIndex
    return history.entries[nextIndex] ?? null
  }

  clearNavigationHistory(): void {
    this.store.primary = getEmptyNavigationHistory()
    this.store.secondary = getEmptyNavigationHistory()
  }
}
