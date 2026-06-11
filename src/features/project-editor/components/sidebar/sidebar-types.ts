import type { FocusScope, SidebarSection } from '../../project-editor-types'
import type { GitHistoryState } from '../../project-editor-types'
import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'
import type { BookExportFormat } from '../../../../shared/ipc'

export interface SidebarSelectionProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
}

export interface SidebarPanelLayoutProps {
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  effectiveCollapsed: boolean
}

export interface SidebarProjectContextProps {
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  statusMessage: string
  gitHistory: GitHistoryState
  onImport: () => void
  onImportZulu: () => void
  onExportBook: (format: BookExportFormat) => void
  onExport: () => void
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
}

export type SidebarPanelCommonProps = SidebarSelectionProps &
  SidebarPanelLayoutProps &
  SidebarProjectContextProps &
  SidebarThemeProps &
  SidebarSpellcheckProps &
  SidebarWorkspacePrefsProps & {
    corkboardOrder?: Record<string, string[]>
  }

export type SidebarExplorerCommonProps = SidebarSelectionProps & SidebarProjectContextProps & {
  corkboardOrder?: Record<string, string[]>
}
