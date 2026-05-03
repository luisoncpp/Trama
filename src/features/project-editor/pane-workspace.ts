import type { PaneDocumentState, WorkspaceLayoutState, WorkspacePane } from './project-editor-types'

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
  ) {}

  scheduleAutosave(pane: WorkspacePane, saveFn: () => Promise<void>, delay: number): void {
    this.cancelAutosave()
    const capturedPane = pane
    this.autosaveTimer = window.setTimeout(() => {
      this.autosaveTimer = null
      if (this.layoutState.activePane === capturedPane) {
        void saveFn()
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
