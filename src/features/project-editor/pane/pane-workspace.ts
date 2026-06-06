import type { DocumentMeta } from '../../../shared/ipc'
import type {
  PaneDocumentState,
  PaneNavigationHistoryState,
  PaneNavigationHistoryStore,
  RevisionRailState,
  WorkspaceLayoutState,
  WorkspacePane,
} from '../project-editor-types'
import { PaneNavigation } from './pane-navigation'
import { buildActivePaneDocumentInfo, buildPaneDocumentInfo } from './pane-workspace-private/pane-workspace-document-info'
import { PaneAutosave } from './pane-workspace-private/pane-workspace-autosave'
import {
  getPaneState,
  getSerializationRefForPane,
  type PaneSerializationRefs,
} from './pane-workspace-private/pane-workspace-bindings'
import {
  preparePaneExitIntent,
  preparePaneRevertIntent,
  savePaneIfDirtyIntent,
  savePaneNowIntent,
  type PreparePaneExitResult,
  type PreparePaneRevertResult,
  type SavePaneNowResult,
} from './pane-workspace-private/pane-workspace-exit'
import { resolveConstructorDeps } from './pane-workspace-private/pane-workspace-init'
import {
  clearPanes as clearPanesMutation,
  exitRevisionPreview as exitRevisionPreviewMutation,
  loadPaneDocument as loadPaneDocumentMutation,
  markPaneDirty as markPaneDirtyMutation,
  markPaneSaved as markPaneSavedMutation,
  updatePaneContent as updatePaneContentMutation,
  updatePaneMeta as updatePaneMetaMutation,
  updatePaneMetaForPane as updatePaneMetaForPaneMutation,
  updateRevisionRail as updateRevisionRailMutation,
} from './pane-workspace-private/pane-workspace-mutations'
import { PaneSnapshotTracker } from './pane-workspace-private/pane-workspace-snapshot'
import type { ActivePaneDocumentInfo, PaneBindings, PaneDocumentInfo } from './pane-workspace-types'

export type { WorkspacePane }
export type { ActivePaneDocumentInfo, PaneBindings, PaneDocumentInfo } from './pane-workspace-types'
export type { PaneExitReason, PreparePaneExitResult, PreparePaneRevertResult, SavePaneNowResult } from './pane-workspace-private/pane-workspace-exit'

export class PaneWorkspace {
  private autosave = new PaneAutosave()
  private snapshotTracker: PaneSnapshotTracker
  private navigation: PaneNavigation

  constructor(
    private layoutState: WorkspaceLayoutState,
    private paneBindings: PaneBindings,
    private serializationRefs: PaneSerializationRefs,
    private saveDocumentFn: (path: string, content: string, meta: DocumentMeta) => Promise<void>,
    navigationHistoryOrSavedContent?: PaneNavigationHistoryStore | Map<string, string>,
    savedContentMap?: Map<string, string>,
  ) {
    const { navHistory, savedContentMap: resolvedMap } = resolveConstructorDeps(
      navigationHistoryOrSavedContent,
      savedContentMap,
    )
    this.navigation = new PaneNavigation(navHistory)
    this.snapshotTracker = new PaneSnapshotTracker(resolvedMap)
  }

  updateDependencies(
    layoutState: WorkspaceLayoutState,
    paneBindings: PaneBindings,
    serializationRefs: PaneSerializationRefs,
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
    this.snapshotTracker.destroy()
  }

  getLastSavedContent(path: string): string | null { return this.snapshotTracker.get(path) }
  getPaneNavigationHistory(pane: WorkspacePane): PaneNavigationHistoryState { return this.navigation.getPaneNavigationHistory(pane) }
  recordPaneNavigation(pane: WorkspacePane, path: string): void { return this.navigation.recordPaneNavigation(pane, path) }
  getPreviousPathInPaneHistory(pane: WorkspacePane): string | null { return this.navigation.getPreviousPathInPaneHistory(pane) }
  getNextPathInPaneHistory(pane: WorkspacePane): string | null { return this.navigation.getNextPathInPaneHistory(pane) }
  stepPaneNavigationHistory(pane: WorkspacePane, direction: -1 | 1): string | null { return this.navigation.stepPaneNavigationHistory(pane, direction) }
  clearNavigationHistory(): void { return this.navigation.clearNavigationHistory() }

  flushPaneContent(pane: WorkspacePane): string | null {
    return getSerializationRefForPane(pane, this.serializationRefs).current.flush()
  }

  async savePaneIfDirty(pane: WorkspacePane): Promise<void> {
    const paneDocument = getPaneState(pane, this.paneBindings)
    await savePaneIfDirtyIntent(
      paneDocument,
      () => this.flushPaneContent(pane),
      this.saveDocumentFn,
      (path, content) => markPaneSavedMutation(this.paneBindings, this.snapshotTracker, pane, path, content),
    )
  }

  async savePaneNow(pane: WorkspacePane): Promise<SavePaneNowResult> {
    return savePaneNowIntent(getPaneState(pane, this.paneBindings), () => this.savePaneIfDirty(pane))
  }

  async preparePaneExit(pane: WorkspacePane): Promise<PreparePaneExitResult> {
    return preparePaneExitIntent(getPaneState(pane, this.paneBindings), () => this.savePaneIfDirty(pane))
  }

  preparePaneRevert(pane: WorkspacePane): PreparePaneRevertResult {
    return preparePaneRevertIntent(getPaneState(pane, this.paneBindings), () => this.flushPaneContent(pane))
  }

  async saveAllDirtyPanes(): Promise<void> {
    await Promise.all((['primary', 'secondary'] as const).map((p) => this.savePaneIfDirty(p)))
  }

  getActivePaneDocument(): ActivePaneDocumentInfo {
    const { activePane } = this.layoutState
    return buildActivePaneDocumentInfo(activePane, this.layoutState, getPaneState(activePane, this.paneBindings))
  }

  getPaneDocument(pane: WorkspacePane): PaneDocumentInfo {
    return buildPaneDocumentInfo(getPaneState(pane, this.paneBindings))
  }

  isPaneDirty(pane?: WorkspacePane): boolean { return (pane ? this.getPaneDocument(pane) : this.getActivePaneDocument()).isDirty }
  canSwitchAwayFrom(pane?: WorkspacePane): boolean {
    const doc = this.getPaneDocument(pane ?? this.layoutState.activePane)
    return !doc.isDirty || doc.path === null
  }

  markPaneDirty(pane: WorkspacePane): void { markPaneDirtyMutation(this.paneBindings, pane) }
  updatePaneContent(pane: WorkspacePane, content: string): void { updatePaneContentMutation(this.paneBindings, pane, content) }
  loadPaneDocument(pane: WorkspacePane, path: string, content: string, meta: DocumentMeta): void {
    loadPaneDocumentMutation(this.paneBindings, pane, path, content, meta)
  }
  clearPanes(): void { clearPanesMutation(this.paneBindings) }
  updatePaneMeta(path: string, meta: DocumentMeta): void { updatePaneMetaMutation(this.paneBindings, path, meta) }
  updatePaneMetaForPane(pane: WorkspacePane, meta: DocumentMeta): void { updatePaneMetaForPaneMutation(this.paneBindings, pane, meta) }
  updateRevisionRail(pane: WorkspacePane, updater: RevisionRailState | ((prev: RevisionRailState) => RevisionRailState)): void {
    updateRevisionRailMutation(this.paneBindings, pane, updater)
  }
  exitRevisionPreview(pane: WorkspacePane): void { exitRevisionPreviewMutation(this.paneBindings, pane) }

  async checkExternalChangeMatchesSavedSnapshot(path: string, externalContent: string): Promise<boolean> {
    return this.snapshotTracker.checkExternalChangeMatchesSavedSnapshot(path, externalContent)
  }

  get layout(): Readonly<WorkspaceLayoutState> { return Object.freeze({ ...this.layoutState }) }
  get primary(): Readonly<PaneDocumentState> { return Object.freeze({ ...this.paneBindings.primaryPane }) }
  get secondary(): Readonly<PaneDocumentState> { return Object.freeze({ ...this.paneBindings.secondaryPane }) }
}
