import type { DocumentMeta } from '../../shared/ipc.js'

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
  corkboardOrder: Record<string, string[]>
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
  selectFile: (filePath: string) => Promise<void>
  openFileInPane: (filePath: string, pane: WorkspacePane) => void
  createArticle: (input: SidebarCreateInput) => Promise<void>
  createCategory: (input: SidebarCreateInput) => Promise<void>
  renameFile: (input: SidebarRenameInput) => Promise<void>
  renameFolder: (input: SidebarRenameInput) => Promise<void>
  deleteFolder: (path: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
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
  updateEditorValue: (value: string, pane?: WorkspacePane) => void
  saveNow: (pane?: WorkspacePane) => void
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
