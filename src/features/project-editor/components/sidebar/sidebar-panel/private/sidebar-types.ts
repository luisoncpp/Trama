// @Architecture(descriptionShort="Shared TypeScript types for adjacent module")
import type { ResolvedTheme, ThemePreference } from '../../../../../../theme/theme-types'
import type { BookExportFormat } from '../../../../../../shared/ipc'

export interface SidebarDialogOpenerProps {
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

export type SidebarPanelCommonProps = { effectiveCollapsed: boolean } &
  SidebarDialogOpenerProps &
  SidebarThemeProps &
  SidebarSpellcheckProps
