export type SidebarSection = 'explorer' | 'outline' | 'lore' | 'settings'

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
