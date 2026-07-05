// @Architecture(descriptionShort="Shared TypeScript types for adjacent module")
import type { SidebarSection } from '../../../../project-editor-types'
import type { ResolvedTheme, ThemePreference } from '../../../../../../theme/theme-types'
import type { BookExportFormat } from '../../../../../../shared/ipc'

export interface SidebarPanelLayoutProps {
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  effectiveCollapsed: boolean
}

export interface SidebarProjectContextProps {
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
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

export type SidebarPanelCommonProps = SidebarPanelLayoutProps &
  SidebarProjectContextProps &
  SidebarThemeProps &
  SidebarSpellcheckProps
