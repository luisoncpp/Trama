import type { FocusScope, SidebarCreateInput, SidebarSection } from '../../project-editor-types'
import type { GitHistoryState } from '../../project-editor-types'
import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'
import type { BookExportFormat } from '../../../../shared/ipc'

export interface SidebarSelectionProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => Promise<void>
}

export interface SidebarPanelLayoutProps {
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  effectiveCollapsed: boolean
  onSelectSidebarSection: (section: SidebarSection) => void
  onToggleSidebarPanelCollapsed: () => void
}

export interface SidebarProjectContextProps {
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  statusMessage: string
  gitHistory: GitHistoryState
  onPickFolder: () => void
  onImport: () => void
  onImportZulu: () => void
  onExportBook: (format: BookExportFormat) => void
  onExport: () => void
  onSaveSnapshot: () => void
}

export interface SidebarThemeProps {
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
}

export interface SidebarSpellcheckProps {
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
}

export interface SidebarWorkspacePrefsProps {
  focusModeEnabled: boolean
  focusScope: FocusScope
  onFocusScopeChange: (scope: FocusScope) => void
}

export interface SidebarFileActions {
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateMap: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
  onRenameFile: (path: string, newName: string) => void
  onRenameFolder: (path: string, newName: string) => void
  onDeleteFolder: (path: string) => void
  onDeleteFile: (path: string, options?: { deleteAssociatedImages?: boolean }) => void
  onEditFileTags: (path: string, tags: string[]) => void
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  corkboardOrder?: Record<string, string[]>
}

export type SidebarPanelCommonProps = SidebarSelectionProps &
  SidebarPanelLayoutProps &
  SidebarFileActions &
  SidebarProjectContextProps &
  SidebarThemeProps &
  SidebarSpellcheckProps &
  SidebarWorkspacePrefsProps

export type SidebarExplorerCommonProps = SidebarSelectionProps & SidebarProjectContextProps & SidebarFileActions & {
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
}
