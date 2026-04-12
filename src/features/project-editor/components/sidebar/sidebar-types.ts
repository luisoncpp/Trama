import type { FocusScope, SidebarCreateInput, SidebarSection } from '../../project-editor-types'
import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'

export interface SidebarSelectionProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
}

export interface SidebarPanelLayoutProps {
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  onSelectSidebarSection: (section: SidebarSection) => void
  onToggleSidebarPanelCollapsed: () => void
  onSidebarPanelWidthChange: (width: number) => void
}

export interface SidebarProjectContextProps {
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  onPickFolder: () => void
  onImport: () => void
  onExport: () => void
}

export interface SidebarThemeProps {
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
}

export interface SidebarWorkspacePrefsProps {
  focusModeEnabled: boolean
  focusScope: FocusScope
  onFocusScopeChange: (scope: FocusScope) => void
}

export interface SidebarFileActions {
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
  onEditFileTags: (path: string, tags: string[]) => void
}

export type SidebarPanelCommonProps = SidebarSelectionProps &
  SidebarPanelLayoutProps &
  SidebarFileActions &
  SidebarProjectContextProps &
  SidebarThemeProps &
  SidebarWorkspacePrefsProps

export type SidebarExplorerCommonProps = SidebarSelectionProps & SidebarProjectContextProps & SidebarFileActions