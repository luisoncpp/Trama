import type { DocumentMeta, ProjectSnapshot } from '../../shared/ipc.js'
import type { GitHistoryState, RevisionRailState } from './project-editor-revision-types.js'

export type { GitHistoryState, RevisionRailState } from './project-editor-revision-types.js'

export type SidebarSection = 'explorer' | 'outline' | 'lore' | 'transfer' | 'settings'
export type WorkspaceLayoutMode = 'single' | 'split'
export type WorkspacePane = 'primary' | 'secondary'
export type FocusScope = 'line' | 'sentence' | 'paragraph'

export interface WorkspaceLayoutState {
  mode: WorkspaceLayoutMode
  ratio: number
  primaryPath: string | null
  secondaryPath: string | null
  activePane: WorkspacePane
  focusModeEnabled: boolean
  focusScope: FocusScope
  zoomLevel: number
}

export interface PaneDocumentState {
  path: string | null
  content: string
  meta: Readonly<DocumentMeta>
  isDirty: boolean
  reloadVersion: number
  revisionRail: RevisionRailState
}

export interface SidebarCreateInput {
  directory: string
  name: string
  sourceImagePath: string
}

export interface SidebarRenameInput {
  path: string
  newName: string
}

export type ProjectEditorState = Omit<ProjectEditorStateValues, 'snapshot' | 'editorMeta'>

export interface ProjectEditorStateValues {
  apiAvailable: boolean
  rootPath: string
  snapshot: ProjectSnapshot | null
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  selectedPath: string | null
  editorValue: string
  editorMeta: DocumentMeta
  isDirty: boolean
  loadingProject: boolean
  loadingDocument: boolean
  saving: boolean
  isFullscreen: boolean
  externalConflictPath: string | null
  conflictComparisonContent: string | null
  statusMessage: string
  visibleFiles: string[]
  corkboardOrder: Record<string, string[]>
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  workspaceLayout: WorkspaceLayoutState
  gitHistory: GitHistoryState
}

export interface ProjectEditorDocumentState {
  selectedPath: string | null
  editorValue: string
  editorMeta: DocumentMeta
  isDirty: boolean
}

export interface ProjectEditorPaneState {
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
}

export interface ProjectEditorLayoutState {
  workspaceLayout: WorkspaceLayoutState
}

export interface ProjectEditorSidebarState {
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  focusModeEnabled: boolean
}

export interface ProjectEditorProjectState {
  rootPath: string
  snapshot: ProjectSnapshot | null
  visibleFiles: string[]
  corkboardOrder: Record<string, string[]>
}

export interface ProjectEditorUiState {
  apiAvailable: boolean
  loadingProject: boolean
  loadingDocument: boolean
  saving: boolean
  isFullscreen: boolean
  externalConflictPath: string | null
  conflictComparisonContent: string | null
  statusMessage: string
  gitHistory: GitHistoryState
}

export interface ProjectEditorActions {
  pickProjectFolder: () => Promise<void>
  selectFile: (filePath: string) => Promise<void>
  openFileInPane: (filePath: string, pane: WorkspacePane) => void
  openPreviousInPaneHistory: (pane?: WorkspacePane) => Promise<void>
  openNextInPaneHistory: (pane?: WorkspacePane) => Promise<void>
  createArticle: (input: SidebarCreateInput) => Promise<void>
  createMap: (input: SidebarCreateInput) => Promise<void>
  createCategory: (input: SidebarCreateInput) => Promise<void>
  renameFile: (input: SidebarRenameInput) => Promise<void>
  renameFolder: (input: SidebarRenameInput) => Promise<void>
  deleteFolder: (path: string) => Promise<void>
  deleteFile: (path: string, options?: { deleteAssociatedImages?: boolean }) => Promise<void>
  editFileTags: (path: string, tags: string[]) => Promise<void>
  reorderFiles: (folderPath: string, orderedIds: string[]) => Promise<void>
  moveFile: (sourcePath: string, targetFolder: string) => Promise<void>
  moveFolder: (sourcePath: string, targetParent: string) => Promise<void>
  setSidebarSection: (section: SidebarSection) => void
  toggleSidebarPanelCollapsed: () => void
  setSidebarPanelWidth: (width: number) => void
  toggleWorkspaceLayoutMode: () => void
  setWorkspaceLayoutRatio: (ratio: number) => void
  setWorkspaceActivePane: (pane: WorkspacePane) => Promise<void>
  setFullscreenEnabled: (enabled: boolean) => Promise<void>
  toggleFocusMode: () => void
  setFocusScope: (scope: FocusScope) => void
  setZoomLevel: (level: number) => void
  markEditorDirty: (pane?: WorkspacePane) => void
  updateEditorMeta: (meta: DocumentMeta, pane?: WorkspacePane) => void
  updateEditorValue: (value: string, pane?: WorkspacePane) => void
  saveNow: (pane?: WorkspacePane) => Promise<void>
  saveSnapshot: () => Promise<void>
  revertChanges: (pane?: WorkspacePane) => void
  toggleDocumentRevisions: (path: string, pane?: WorkspacePane) => Promise<void>
  closeDocumentRevisions: (pane?: WorkspacePane) => void
  selectRevisionCurrent: (pane?: WorkspacePane) => void
  selectDocumentRevision: (commitSha: string, pane?: WorkspacePane) => Promise<void>
  loadMoreDocumentRevisions: (pane?: WorkspacePane) => Promise<void>
  requestLoadDocumentRevision: (pane?: WorkspacePane) => void
  cancelLoadDocumentRevision: (pane?: WorkspacePane) => void
  confirmLoadDocumentRevision: (pane?: WorkspacePane) => Promise<void>
  resolveConflictReload: () => void
  resolveConflictKeep: () => void
  resolveConflictSaveAsCopy: () => void
  resolveConflictCompare: () => void
  closeConflictCompare: () => void
}

export interface EditorSerializationRefs {
  flush: () => string | null
  tagOverlayRecalcRef: { current: boolean }
  tagOverlayMatchesRef: { current: Array<{ tag: string; start: number; end: number; filePath: string }> }
}

export interface EditorZoomRef {
  current: number
}

export interface PaneNavigationHistoryState {
  entries: string[]
  index: number
}

export interface PaneNavigationHistoryStore {
  primary: PaneNavigationHistoryState
  secondary: PaneNavigationHistoryState
}

export interface ProjectEditorModel {
  state: ProjectEditorState
  actions: ProjectEditorActions
  serializationRefs: {
    primary: { current: EditorSerializationRefs }
    secondary: { current: EditorSerializationRefs }
  }
  zoomRef: EditorZoomRef
}
