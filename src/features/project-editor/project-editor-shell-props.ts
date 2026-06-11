import type { BookExportFormat } from '../../shared/ipc'
import type { ResolvedTheme, ThemePreference } from '../../theme/theme-types'
import type { ProjectEditorModel } from './project-editor-types'
import type { ProjectEditorDialogsProps } from './project-editor-dialogs'

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

export interface ProjectEditorShellSettingsProps {
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
}

export interface ProjectEditorSidebarShellProps extends ProjectEditorShellSettingsProps {
  shellState: ProjectEditorShellState
  effectiveCollapsed: boolean
  dialogsProps: ProjectEditorDialogsProps
  setSidebarPanelWidth: (width: number) => void
}

function buildSidebarProjectContextProps(
  shellState: ProjectEditorShellState,
  props: ProjectEditorSidebarShellProps,
) {
  return {
    corkboardOrder: shellState.corkboardOrder,
    apiAvailable: shellState.apiAvailable,
    loadingProject: shellState.loadingProject,
    rootPath: shellState.rootPath,
    statusMessage: shellState.statusMessage,
    gitHistory: shellState.gitHistory,
    onImport: () => props.dialogsProps.aiImport.setOpen(true),
    onImportZulu: () => props.dialogsProps.zuluImport.setOpen(true),
    onExportBook: (format: BookExportFormat) => {
      props.dialogsProps.bookExport.setFormat(format)
      props.dialogsProps.bookExport.setOutputPath('')
      props.dialogsProps.bookExport.setOpen(true)
    },
    onExport: () => props.dialogsProps.aiExport.setOpen(true),
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
  const { shellState } = props

  return {
    visibleFiles: shellState.visibleFiles,
    selectedPath: shellState.selectedPath,
    loadingDocument: shellState.loadingDocument,
    sidebarActiveSection: shellState.sidebarActiveSection,
    sidebarPanelCollapsed: shellState.sidebarPanelCollapsed,
    effectiveCollapsed: props.effectiveCollapsed,
    ...buildSidebarProjectContextProps(shellState, props),
  }
}
