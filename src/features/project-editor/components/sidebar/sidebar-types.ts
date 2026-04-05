import type { SidebarCreateInput, SidebarSection } from '../../project-editor-types'

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
}

export interface SidebarFileActions {
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
}

export type SidebarPanelCommonProps = SidebarSelectionProps &
  SidebarPanelLayoutProps &
  SidebarFileActions &
  SidebarProjectContextProps

export type SidebarExplorerCommonProps = SidebarSelectionProps & SidebarProjectContextProps & SidebarFileActions