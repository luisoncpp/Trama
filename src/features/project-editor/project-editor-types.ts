export interface ProjectEditorState {
  apiAvailable: boolean
  rootPath: string
  statusMessage: string
  externalConflictPath: string | null
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
  updateEditorValue: (value: string) => void
  saveNow: () => void
  resolveConflictReload: () => void
  resolveConflictKeep: () => void
}

export interface ProjectEditorModel {
  state: ProjectEditorState
  actions: ProjectEditorActions
}
