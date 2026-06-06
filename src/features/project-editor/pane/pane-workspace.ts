import type { DocumentMeta } from '../../../shared/ipc'
import type {
  EditorSerializationRefs,
  PaneDocumentState,
  PaneNavigationHistoryState,
  PaneNavigationHistoryStore,
  RevisionRailState,
  WorkspaceLayoutState,
  WorkspacePane,
} from '../project-editor-types'
import { buildActivePaneDocumentInfo, buildPaneDocumentInfo } from './pane-workspace-document-info'
import {
  preparePaneExitIntent,
  preparePaneRevertIntent,
  savePaneIfDirtyIntent,
  savePaneNowIntent,
  type PreparePaneExitResult,
  type PreparePaneRevertResult,
  type SavePaneNowResult,
} from './pane-workspace-exit'
import {
  buildExitedRevisionRailState,
  buildLoadedPaneDocumentState,
  buildUpdatedPaneContentState,
  createEmptyPaneRevisionRail,
} from './pane-workspace-revision-state'
import { logSnapshotComparison } from './snapshot-compare-logger'
import { PaneNavigation } from './pane-navigation'
import { PaneAutosave } from './pane-workspace-autosave'
import type { ActivePaneDocumentInfo, PaneBindings, PaneDocumentInfo } from './pane-workspace-types'

export type { WorkspacePane }
export type { ActivePaneDocumentInfo, PaneBindings, PaneDocumentInfo } from './pane-workspace-types'
export type { PaneExitReason, PreparePaneExitResult, PreparePaneRevertResult, SavePaneNowResult } from './pane-workspace-exit'

export class PaneWorkspace {
  private autosave = new PaneAutosave()
  private lastSavedContentMap: Map<string, string>
  private ownsSavedContentMap: boolean
  private navigation: PaneNavigation
  constructor(
    private layoutState: WorkspaceLayoutState,
    private paneBindings: PaneBindings,
    private serializationRefs: {
      primary: { current: EditorSerializationRefs }
      secondary: { current: EditorSerializationRefs }
    },
    private saveDocumentFn: (path: string, content: string, meta: DocumentMeta) => Promise<void>,
    navigationHistoryOrSavedContent?: PaneNavigationHistoryStore | Map<string, string>,
    savedContentMap?: Map<string, string>,
  ) {
    const navHistory = navigationHistoryOrSavedContent instanceof Map
      ? undefined
      : (navigationHistoryOrSavedContent as PaneNavigationHistoryStore | undefined)
    const resolvedMap = navigationHistoryOrSavedContent instanceof Map
      ? navigationHistoryOrSavedContent
      : savedContentMap

    this.navigation = new PaneNavigation(navHistory ?? { primary: { entries: [], index: -1 }, secondary: { entries: [], index: -1 } })
    this.lastSavedContentMap = resolvedMap ?? new Map()
    this.ownsSavedContentMap = !resolvedMap
  }
  updateDependencies(
    layoutState: WorkspaceLayoutState,
    paneBindings: PaneBindings,
    serializationRefs: {
      primary: { current: EditorSerializationRefs }
      secondary: { current: EditorSerializationRefs }
    },
    saveDocumentFn: (path: string, content: string, meta: DocumentMeta) => Promise<void>,
  ): void {
    this.layoutState = layoutState
    this.paneBindings = paneBindings
    this.serializationRefs = serializationRefs
    this.saveDocumentFn = saveDocumentFn
  }
  scheduleAutosave(pane: WorkspacePane, delay: number): void {
    const capturedPane = pane
    this.autosave.schedule(
      delay,
      () => this.layoutState.activePane === capturedPane,
      () => { void this.savePaneIfDirty(capturedPane) },
    )
  }

  cancelAutosave(): void {
    this.autosave.cancel()
  }

  destroy(): void {
    this.autosave.destroy()
    if (this.ownsSavedContentMap) this.lastSavedContentMap.clear()
  }
  getLastSavedContent(path: string): string | null { return this.lastSavedContentMap.get(path) ?? null }
  getPaneNavigationHistory(pane: WorkspacePane): PaneNavigationHistoryState { return this.navigation.getPaneNavigationHistory(pane) }
  recordPaneNavigation(pane: WorkspacePane, path: string): void { return this.navigation.recordPaneNavigation(pane, path) }
  getPreviousPathInPaneHistory(pane: WorkspacePane): string | null { return this.navigation.getPreviousPathInPaneHistory(pane) }
  getNextPathInPaneHistory(pane: WorkspacePane): string | null { return this.navigation.getNextPathInPaneHistory(pane) }
  stepPaneNavigationHistory(pane: WorkspacePane, direction: -1 | 1): string | null { return this.navigation.stepPaneNavigationHistory(pane, direction) }
  clearNavigationHistory(): void { return this.navigation.clearNavigationHistory() }
  private getSerializationRefForPane(pane: WorkspacePane) {
    return pane === 'secondary' ? this.serializationRefs.secondary : this.serializationRefs.primary
  }

  private getPaneState(pane: WorkspacePane): PaneDocumentState {
    return pane === 'secondary' ? this.paneBindings.secondaryPane : this.paneBindings.primaryPane
  }
  private updatePaneState(
    pane: WorkspacePane,
    updater: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState),
  ): void {
    if (pane === 'secondary') {
      this.paneBindings.setSecondaryPane(updater)
      return
    }
    this.paneBindings.setPrimaryPane(updater)
  }
  flushPaneContent(pane: WorkspacePane): string | null {
    return this.getSerializationRefForPane(pane).current.flush()
  }

  async savePaneIfDirty(pane: WorkspacePane): Promise<void> {
    const paneDocument = this.getPaneState(pane)
    await savePaneIfDirtyIntent(
      paneDocument,
      () => this.flushPaneContent(pane),
      this.saveDocumentFn,
      (path, content) => this.markPaneSaved(pane, path, content),
    )
  }
  async savePaneNow(pane: WorkspacePane): Promise<SavePaneNowResult> {
    return savePaneNowIntent(this.getPaneState(pane), () => this.savePaneIfDirty(pane))
  }

  async preparePaneExit(pane: WorkspacePane): Promise<PreparePaneExitResult> {
    return preparePaneExitIntent(this.getPaneState(pane), () => this.savePaneIfDirty(pane))
  }

  preparePaneRevert(pane: WorkspacePane): PreparePaneRevertResult {
    return preparePaneRevertIntent(this.getPaneState(pane), () => this.flushPaneContent(pane))
  }

  async saveAllDirtyPanes(): Promise<void> {
    await Promise.all((['primary', 'secondary'] as const).map((p) => this.savePaneIfDirty(p)))
  }

  getActivePaneDocument(): ActivePaneDocumentInfo {
    const { activePane } = this.layoutState
    return buildActivePaneDocumentInfo(activePane, this.layoutState, this.getPaneState(activePane))
  }

  getPaneDocument(pane: WorkspacePane): PaneDocumentInfo {
    return buildPaneDocumentInfo(this.getPaneState(pane))
  }
  isPaneDirty(pane?: WorkspacePane): boolean { return (pane ? this.getPaneDocument(pane) : this.getActivePaneDocument()).isDirty }
  canSwitchAwayFrom(pane?: WorkspacePane): boolean {
    const doc = this.getPaneDocument(pane ?? this.layoutState.activePane)
    return !doc.isDirty || doc.path === null
  }

  markPaneDirty(pane: WorkspacePane): void {
    this.updatePaneState(pane, (prev) => (prev.isDirty ? prev : { ...prev, isDirty: true }))
  }
  updatePaneContent(pane: WorkspacePane, content: string): void {
    this.updatePaneState(pane, (prev) => buildUpdatedPaneContentState(prev, content))
  }

  loadPaneDocument(pane: WorkspacePane, path: string, content: string, meta: DocumentMeta): void {
    this.updatePaneState(pane, (prev) => buildLoadedPaneDocumentState(prev, path, content, meta))
  }

  clearPanes(): void {
    this.paneBindings.setPrimaryPane({ path: null, content: '', meta: {}, isDirty: false, reloadVersion: 0, revisionRail: createEmptyPaneRevisionRail() })
    this.paneBindings.setSecondaryPane({ path: null, content: '', meta: {}, isDirty: false, reloadVersion: 0, revisionRail: createEmptyPaneRevisionRail() })
  }
  updatePaneMeta(path: string, meta: DocumentMeta): void {
    this.updatePaneState('primary', (prev) => prev.path === path ? { ...prev, meta } : prev)
    this.updatePaneState('secondary', (prev) => prev.path === path ? { ...prev, meta } : prev)
  }

  updatePaneMetaForPane(pane: WorkspacePane, meta: DocumentMeta): void {
    this.updatePaneState(pane, (prev) => ({ ...prev, meta, isDirty: true }))
  }

  updateRevisionRail(pane: WorkspacePane, updater: RevisionRailState | ((prev: RevisionRailState) => RevisionRailState)): void {
    this.updatePaneState(pane, (prev) => ({
      ...prev,
      revisionRail: typeof updater === 'function' ? updater(prev.revisionRail) : updater,
    }))
  }
  exitRevisionPreview(pane: WorkspacePane): void {
    this.updateRevisionRail(pane, buildExitedRevisionRailState)
  }

  private markPaneSaved(pane: WorkspacePane, path: string, content: string): void {
    this.lastSavedContentMap.set(path, content)
    this.updatePaneState(pane, (prev) => prev.path === path ? { ...prev, isDirty: false } : prev)
  }
  async checkExternalChangeMatchesSavedSnapshot(path: string, externalContent: string): Promise<boolean> {
    const savedContent = this.getLastSavedContent(path)
    const matches = savedContent !== null && savedContent === externalContent
    logSnapshotComparison(path, savedContent, externalContent, matches)
    return matches
  }

  get layout(): Readonly<WorkspaceLayoutState> { return Object.freeze({ ...this.layoutState }) }
  get primary(): Readonly<PaneDocumentState> { return Object.freeze({ ...this.paneBindings.primaryPane }) }
  get secondary(): Readonly<PaneDocumentState> { return Object.freeze({ ...this.paneBindings.secondaryPane }) }
}
