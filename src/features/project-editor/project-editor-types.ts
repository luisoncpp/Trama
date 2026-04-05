export type SidebarSection = 'explorer' | 'outline' | 'lore' | 'settings'

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
  externalConflictPath: string | null
  conflictComparisonContent: string | null
  visibleFiles: string[]
  selectedPath: string | null
  editorValue: string
  isDirty: boolean
  loadingProject: boolean
  loadingDocument: boolean
  saving: boolean
}

export interface ProjectEditorActions {
  pickProjectFolder: () => Promise<void>
  selectFile: (filePath: string) => void
  createArticle: (input: SidebarCreateInput) => Promise<void>
  createCategory: (input: SidebarCreateInput) => Promise<void>
  renameFile: (input: SidebarRenameInput) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  setSidebarSection: (section: SidebarSection) => void
  toggleSidebarPanelCollapsed: () => void
  setSidebarPanelWidth: (width: number) => void
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
