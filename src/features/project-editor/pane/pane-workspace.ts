import type { DocumentMeta } from '../../../shared/ipc'
import type {
  EditorSerializationRefs,
  PaneDocumentState,
  PaneNavigationHistoryState,
  PaneNavigationHistoryStore,
  WorkspaceLayoutState,
  WorkspacePane,
} from '../project-editor-types'
import { executePaneSave } from './pane-save-logic'
import { logSnapshotComparison } from './snapshot-compare-logger'

export type { WorkspacePane }

export interface PaneDocumentInfo {
  path: string | null
  content: string
  isDirty: boolean
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

function getEmptyNavigationHistory(): PaneNavigationHistoryState {
  return { entries: [], index: -1 }
}

function getHistoryForPane(
  historyStore: PaneNavigationHistoryStore,
  pane: WorkspacePane,
): PaneNavigationHistoryState {
  return pane === 'secondary' ? historyStore.secondary : historyStore.primary
}

function createNavigationHistoryStore(): PaneNavigationHistoryStore {
  return {
    primary: getEmptyNavigationHistory(),
    secondary: getEmptyNavigationHistory(),
  }
}

function isSavedContentMap(value: unknown): value is Map<string, string> {
  return value instanceof Map
}

export class PaneWorkspace {
  private autosaveTimer: number | null = null
  private lastSavedContentMap: Map<string, string>
  private ownsSavedContentMap: boolean
  private navigationHistory: PaneNavigationHistoryStore

  constructor(
    private layoutState: WorkspaceLayoutState,
    private paneBindings: PaneBindings,
    private serializationRefs: {
      primary: { current: EditorSerializationRefs }
      secondary: { current: EditorSerializationRefs }
    },
    private saveDocumentFn: (
      path: string,
      content: string,
      meta: DocumentMeta
    ) => Promise<void>,
    navigationHistoryOrSavedContent?: PaneNavigationHistoryStore | Map<string, string>,
    savedContentMap?: Map<string, string>,
  ) {
    const navigationHistory = isSavedContentMap(navigationHistoryOrSavedContent)
      ? undefined
      : navigationHistoryOrSavedContent
    const resolvedSavedContentMap = isSavedContentMap(navigationHistoryOrSavedContent)
      ? navigationHistoryOrSavedContent
      : savedContentMap

    this.navigationHistory = navigationHistory ?? createNavigationHistoryStore()
    this.lastSavedContentMap = resolvedSavedContentMap ?? new Map()
    this.ownsSavedContentMap = !resolvedSavedContentMap
  }

  scheduleAutosave(pane: WorkspacePane, delay: number): void {
    this.cancelAutosave()
    const capturedPane = pane
    this.autosaveTimer = window.setTimeout(() => {
      this.autosaveTimer = null
      if (this.layoutState.activePane === capturedPane) {
        void this.savePaneIfDirty(capturedPane)
      }
    }, delay)
  }

  cancelAutosave(): void {
    if (this.autosaveTimer !== null) {
      window.clearTimeout(this.autosaveTimer)
      this.autosaveTimer = null
    }
  }

  destroy(): void {
    this.cancelAutosave()
    if (this.ownsSavedContentMap) {
      this.lastSavedContentMap.clear()
    }
  }

  getLastSavedContent(path: string): string | null {
    return this.lastSavedContentMap.get(path) ?? null
  }

  getPaneNavigationHistory(pane: WorkspacePane): PaneNavigationHistoryState {
    const history = getHistoryForPane(this.navigationHistory, pane)
    return {
      entries: [...history.entries],
      index: history.index,
    }
  }

  recordPaneNavigation(pane: WorkspacePane, path: string): void {
    const history = getHistoryForPane(this.navigationHistory, pane)
    if (history.index >= 0 && history.entries[history.index] === path) {
      return
    }

    history.entries = history.entries.slice(0, history.index + 1)
    history.entries.push(path)
    history.index = history.entries.length - 1
  }

  getPreviousPathInPaneHistory(pane: WorkspacePane): string | null {
    const history = getHistoryForPane(this.navigationHistory, pane)
    if (history.index <= 0) {
      return null
    }
    return history.entries[history.index - 1] ?? null
  }

  getNextPathInPaneHistory(pane: WorkspacePane): string | null {
    const history = getHistoryForPane(this.navigationHistory, pane)
    if (history.index < 0 || history.index >= history.entries.length - 1) {
      return null
    }
    return history.entries[history.index + 1] ?? null
  }

  stepPaneNavigationHistory(pane: WorkspacePane, direction: -1 | 1): string | null {
    const history = getHistoryForPane(this.navigationHistory, pane)
    const nextIndex = history.index + direction
    if (nextIndex < 0 || nextIndex >= history.entries.length) {
      return null
    }
    history.index = nextIndex
    return history.entries[nextIndex] ?? null
  }

  clearNavigationHistory(): void {
    this.navigationHistory.primary = getEmptyNavigationHistory()
    this.navigationHistory.secondary = getEmptyNavigationHistory()
  }

  private getSerializationRefForPane(pane: WorkspacePane): { current: EditorSerializationRefs } {
    return pane === 'secondary' ? this.serializationRefs.secondary : this.serializationRefs.primary
  }

  private flushPane(pane: WorkspacePane): string | null {
    const ref = this.getSerializationRefForPane(pane)
    return ref.current.flush()
  }

  async savePaneIfDirty(pane: WorkspacePane): Promise<void> {
    const paneDocument = pane === 'secondary' ? this.paneBindings.secondaryPane : this.paneBindings.primaryPane
    if (!paneDocument.isDirty || !paneDocument.path) {
      return
    }
    const flushResult = this.flushPane(pane)
    const contentToSave = flushResult ?? paneDocument.content
    await executePaneSave(paneDocument, flushResult, this.saveDocumentFn)
    this.markPaneSaved(pane, paneDocument.path, contentToSave)
  }

  async saveAllDirtyPanes(): Promise<void> {
    await Promise.all((['primary', 'secondary'] as const).map((pane) => this.savePaneIfDirty(pane)))
  }

  getActivePaneDocument(): ActivePaneDocumentInfo {
    const { activePane } = this.layoutState
    const pane = activePane === 'secondary' ? this.paneBindings.secondaryPane : this.paneBindings.primaryPane
    const selectedPath = activePane === 'secondary'
      ? this.layoutState.secondaryPath
      : this.layoutState.primaryPath
    return {
      selectedPath,
      editorValue: pane.content,
      editorMeta: pane.meta,
      isDirty: pane.isDirty,
      path: pane.path,
      content: pane.content,
    }
  }

  getPaneDocument(pane: WorkspacePane): PaneDocumentInfo {
    const doc = pane === 'secondary' ? this.paneBindings.secondaryPane : this.paneBindings.primaryPane
    return {
      path: doc.path,
      content: doc.content,
      isDirty: doc.isDirty,
    }
  }

  isPaneDirty(pane?: WorkspacePane): boolean {
    if (!pane) return this.getActivePaneDocument().isDirty
    return this.getPaneDocument(pane).isDirty
  }

  canSwitchAwayFrom(pane?: WorkspacePane): boolean {
    const target = pane ?? this.layoutState.activePane
    const doc = this.getPaneDocument(target)
    return !doc.isDirty || doc.path === null
  }

  updatePaneContent(pane: WorkspacePane, content: string): void {
    if (pane === 'secondary') {
      this.paneBindings.setSecondaryPane((prev) => ({ ...prev, content, isDirty: true }))
    } else {
      this.paneBindings.setPrimaryPane((prev) => ({ ...prev, content, isDirty: true }))
    }
  }

  loadPaneDocument(pane: WorkspacePane, path: string, content: string, meta: DocumentMeta): void {
    const doc: PaneDocumentState = { path, content, meta, isDirty: false }
    if (pane === 'secondary') {
      this.paneBindings.setSecondaryPane(doc)
    } else {
      this.paneBindings.setPrimaryPane(doc)
    }
  }

  clearPanes(): void {
    const emptyPane: PaneDocumentState = { path: null, content: '', meta: {}, isDirty: false }
    this.paneBindings.setPrimaryPane(emptyPane)
    this.paneBindings.setSecondaryPane(emptyPane)
  }

  updatePaneMeta(path: string, meta: DocumentMeta): void {
    this.paneBindings.setPrimaryPane((prev) => prev.path === path ? { ...prev, meta } : prev)
    this.paneBindings.setSecondaryPane((prev) => prev.path === path ? { ...prev, meta } : prev)
  }

  private markPaneSaved(pane: WorkspacePane, path: string, content: string): void {
    this.lastSavedContentMap.set(path, content)
    if (pane === 'secondary') {
      this.paneBindings.setSecondaryPane((prev) => prev.path === path ? { ...prev, isDirty: false } : prev)
    } else {
      this.paneBindings.setPrimaryPane((prev) => prev.path === path ? { ...prev, isDirty: false } : prev)
    }
  }

  async checkExternalChangeMatchesSavedSnapshot(path: string, externalContent: string): Promise<boolean> {
    const savedContent = this.getLastSavedContent(path)
    const matches = savedContent !== null && savedContent === externalContent
    logSnapshotComparison(path, savedContent, externalContent, matches)
    return matches
  }

  get layout(): Readonly<WorkspaceLayoutState> {
    return Object.freeze({ ...this.layoutState })
  }

  get primary(): Readonly<PaneDocumentState> {
    return Object.freeze({ ...this.paneBindings.primaryPane })
  }

  get secondary(): Readonly<PaneDocumentState> {
    return Object.freeze({ ...this.paneBindings.secondaryPane })
  }
}
