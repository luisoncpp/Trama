import type { DocumentMeta } from '../../../shared/ipc'
import type { EditorSerializationRefs, PaneDocumentState, WorkspaceLayoutState, WorkspacePane } from '../project-editor-types'
import { executePaneSave } from './pane-save-logic'

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

export class PaneWorkspace {
  private autosaveTimer: number | null = null

  constructor(
    private layoutState: WorkspaceLayoutState,
    private primaryPane: PaneDocumentState,
    private secondaryPane: PaneDocumentState,
    private serializationRefs: {
      primary: { current: EditorSerializationRefs }
      secondary: { current: EditorSerializationRefs }
    },
    private saveDocumentFn: (
      path: string,
      content: string,
      meta: DocumentMeta
    ) => Promise<void>,
  ) {}

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
  }

  private getSerializationRefForPane(pane: WorkspacePane): { current: EditorSerializationRefs } {
    return pane === 'secondary' ? this.serializationRefs.secondary : this.serializationRefs.primary
  }

  private flushPane(pane: WorkspacePane): string | null {
    const ref = this.getSerializationRefForPane(pane)
    return ref.current.flush()
  }

  async savePaneIfDirty(pane: WorkspacePane): Promise<void> {
    const paneDocument = pane === 'secondary' ? this.secondaryPane : this.primaryPane
    if (!paneDocument.isDirty || !paneDocument.path) {
      return
    }
    const flushResult = this.flushPane(pane)
    await executePaneSave(paneDocument, flushResult, this.saveDocumentFn)
  }

  async saveAllDirtyPanes(): Promise<void> {
    await Promise.all((['primary', 'secondary'] as const).map((pane) => this.savePaneIfDirty(pane)))
  }

  getActivePaneDocument(): ActivePaneDocumentInfo {
    const { activePane } = this.layoutState
    const pane = activePane === 'secondary' ? this.secondaryPane : this.primaryPane
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
    const doc = pane === 'secondary' ? this.secondaryPane : this.primaryPane
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

  get layout(): Readonly<WorkspaceLayoutState> {
    return Object.freeze({ ...this.layoutState })
  }

  get primary(): Readonly<PaneDocumentState> {
    return Object.freeze({ ...this.primaryPane })
  }

  get secondary(): Readonly<PaneDocumentState> {
    return Object.freeze({ ...this.secondaryPane })
  }
}
