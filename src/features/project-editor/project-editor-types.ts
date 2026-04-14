import type { DocumentMeta } from '../../shared/ipc'

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
}

export interface PaneDocumentState {
  path: string | null
  content: string
  meta: DocumentMeta
  isDirty: boolean
}

export interface SidebarCreateInput {
  directory: string
  name: string
}

export interface SidebarRenameInput {
  path: string
  newName: string
}

export interface ProjectEditorState {
  apiAvailable: boolean
  rootPath: string
  statusMessage: string
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  workspaceLayout: WorkspaceLayoutState
  externalConflictPath: string | null
  conflictComparisonContent: string | null
  visibleFiles: string[]
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  selectedPath: string | null
  editorValue: string
  isDirty: boolean
  loadingProject: boolean
  loadingDocument: boolean
  saving: boolean
  isFullscreen: boolean
}

export interface ProjectEditorActions {
  pickProjectFolder: () => Promise<void>
  selectFile: (filePath: string) => void
  openFileInPane: (filePath: string, pane: WorkspacePane) => void
  createArticle: (input: SidebarCreateInput) => Promise<void>
  createCategory: (input: SidebarCreateInput) => Promise<void>
  renameFile: (input: SidebarRenameInput) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  editFileTags: (path: string, tags: string[]) => Promise<void>
  setSidebarSection: (section: SidebarSection) => void
  toggleSidebarPanelCollapsed: () => void
  setSidebarPanelWidth: (width: number) => void
  toggleWorkspaceLayoutMode: () => void
  setWorkspaceLayoutRatio: (ratio: number) => void
  setWorkspaceActivePane: (pane: WorkspacePane) => void
  setFullscreenEnabled: (enabled: boolean) => Promise<void>
  toggleFocusMode: () => void
  setFocusScope: (scope: FocusScope) => void
  updateEditorValue: (value: string) => void
  saveNow: () => void
  resolveConflictReload: () => void
  resolveConflictKeep: () => void
  resolveConflictSaveAsCopy: () => void
  resolveConflictCompare: () => void
  closeConflictCompare: () => void
}

export interface ProjectEditorModel {
  state: ProjectEditorState
  actions: ProjectEditorActions
}
