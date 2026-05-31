import type { BookExportFormat } from '../../shared/ipc'
import type { ResolvedTheme, ThemePreference } from '../../theme/theme-types'
import type { ProjectEditorModel } from './project-editor-types'

export interface ProjectEditorShellState {
  apiAvailable: boolean
  rootPath: string
  visibleFiles: string[]
  selectedPath: string | null
  loadingProject: boolean
  loadingDocument: boolean
  statusMessage: string
  corkboardOrder: Record<string, string[]>
  sidebarActiveSection: ProjectEditorModel['state']['sidebarActiveSection']
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  workspaceLayout: ProjectEditorModel['state']['workspaceLayout']
  gitHistory: ProjectEditorModel['state']['gitHistory']
}

export interface ProjectEditorShellActions {
  selectFile: ProjectEditorModel['actions']['selectFile']
  setSidebarSection: ProjectEditorModel['actions']['setSidebarSection']
  toggleSidebarPanelCollapsed: ProjectEditorModel['actions']['toggleSidebarPanelCollapsed']
  setSidebarPanelWidth: ProjectEditorModel['actions']['setSidebarPanelWidth']
  createArticle: ProjectEditorModel['actions']['createArticle']
  createMap: ProjectEditorModel['actions']['createMap']
  createCategory: ProjectEditorModel['actions']['createCategory']
  renameFile: ProjectEditorModel['actions']['renameFile']
  renameFolder: ProjectEditorModel['actions']['renameFolder']
  deleteFolder: ProjectEditorModel['actions']['deleteFolder']
  deleteFile: ProjectEditorModel['actions']['deleteFile']
  editFileTags: ProjectEditorModel['actions']['editFileTags']
  reorderFiles: ProjectEditorModel['actions']['reorderFiles']
  moveFile: ProjectEditorModel['actions']['moveFile']
  moveFolder: ProjectEditorModel['actions']['moveFolder']
  pickProjectFolder: ProjectEditorModel['actions']['pickProjectFolder']
  setFocusScope: ProjectEditorModel['actions']['setFocusScope']
  saveSnapshot: ProjectEditorModel['actions']['saveSnapshot']
}

export interface ProjectEditorSidebarShellProps {
  shellState: ProjectEditorShellState
  shellActions: ProjectEditorShellActions
  effectiveCollapsed: boolean
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
  onImportClick: () => void
  onImportZuluClick: () => void
  onBookExportClick: (format: BookExportFormat) => void
  onExportClick: () => void
}

function buildSidebarFileActionProps(shellActions: ProjectEditorShellActions) {
  return {
    onCreateArticle: (input: Parameters<typeof shellActions.createArticle>[0]) => {
      void shellActions.createArticle(input)
    },
    onCreateMap: (input: Parameters<typeof shellActions.createMap>[0]) => {
      void shellActions.createMap(input)
    },
    onCreateCategory: (input: Parameters<typeof shellActions.createCategory>[0]) => {
      void shellActions.createCategory(input)
    },
    onRenameFile: (path: string, newName: string) => {
      void shellActions.renameFile({ path, newName })
    },
    onRenameFolder: (path: string, newName: string) => {
      void shellActions.renameFolder({ path, newName })
    },
    onDeleteFolder: (path: string) => {
      void shellActions.deleteFolder(path)
    },
    onDeleteFile: (path: string, options?: { deleteAssociatedImages?: boolean }) => {
      void shellActions.deleteFile(path, options)
    },
    onEditFileTags: (path: string, tags: string[]) => {
      void shellActions.editFileTags(path, tags)
    },
  }
}

function buildSidebarWorkspaceActionProps(shellActions: ProjectEditorShellActions) {
  return {
    onSelectFile: shellActions.selectFile,
    onSelectSidebarSection: shellActions.setSidebarSection,
    onToggleSidebarPanelCollapsed: shellActions.toggleSidebarPanelCollapsed,
    onSidebarPanelWidthChange: shellActions.setSidebarPanelWidth,
    onReorderFiles: (folderPath: string, orderedIds: string[]) => shellActions.reorderFiles(folderPath, orderedIds),
    onMoveFile: (sourcePath: string, targetFolder: string) => shellActions.moveFile(sourcePath, targetFolder),
    onMoveFolder: (sourcePath: string, targetParent: string) => shellActions.moveFolder(sourcePath, targetParent),
    onFocusScopeChange: shellActions.setFocusScope,
  }
}

function buildSidebarProjectContextProps(
  shellState: ProjectEditorShellState,
  shellActions: ProjectEditorShellActions,
  props: ProjectEditorSidebarShellProps,
) {
  return {
    corkboardOrder: shellState.corkboardOrder,
    apiAvailable: shellState.apiAvailable,
    loadingProject: shellState.loadingProject,
    rootPath: shellState.rootPath,
    statusMessage: shellState.statusMessage,
    gitHistory: shellState.gitHistory,
    onPickFolder: () => {
      void shellActions.pickProjectFolder()
    },
    onImport: props.onImportClick,
    onImportZulu: props.onImportZuluClick,
    onExportBook: props.onBookExportClick,
    onExport: props.onExportClick,
    onSaveSnapshot: () => {
      void shellActions.saveSnapshot()
    },
    themePreference: props.themePreference,
    resolvedTheme: props.resolvedTheme,
    onThemePreferenceChange: props.onThemePreferenceChange,
    spellcheckEnabled: props.spellcheckEnabled,
    spellcheckLanguage: props.spellcheckLanguage,
    spellcheckLanguageOptions: props.spellcheckLanguageOptions,
    spellcheckLanguageSelectionSupported: props.spellcheckLanguageSelectionSupported,
    onSpellcheckEnabledChange: props.onSpellcheckEnabledChange,
    onSpellcheckLanguageChange: props.onSpellcheckLanguageChange,
    focusModeEnabled: shellState.workspaceLayout.focusModeEnabled,
    focusScope: shellState.workspaceLayout.focusScope,
  }
}

export function buildSidebarSectionProps(props: ProjectEditorSidebarShellProps) {
  const { shellState, shellActions } = props

  return {
    visibleFiles: shellState.visibleFiles,
    selectedPath: shellState.selectedPath,
    loadingDocument: shellState.loadingDocument,
    sidebarActiveSection: shellState.sidebarActiveSection,
    sidebarPanelCollapsed: shellState.sidebarPanelCollapsed,
    effectiveCollapsed: props.effectiveCollapsed,
    sidebarPanelWidth: shellState.sidebarPanelWidth,
    ...buildSidebarFileActionProps(shellActions),
    ...buildSidebarWorkspaceActionProps(shellActions),
    ...buildSidebarProjectContextProps(shellState, shellActions, props),
  }
}
