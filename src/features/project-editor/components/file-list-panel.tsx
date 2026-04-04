import type { SidebarSection } from '../project-editor-types'
import { SidebarRail } from './sidebar-rail'
import { SidebarExplorerContent } from './sidebar-explorer-content'
import { SidebarSectionPlaceholder } from './sidebar-section-placeholder'

interface FileListPanelProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  onSelectSidebarSection: (section: SidebarSection) => void
  onToggleSidebarPanelCollapsed: () => void
  onSidebarPanelWidthChange: (width: number) => void
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  statusMessage: string
  onPickFolder: () => void
}

export function FileListPanel({
  sidebarActiveSection,
  sidebarPanelCollapsed,
  sidebarPanelWidth,
  onSelectSidebarSection,
  onToggleSidebarPanelCollapsed,
  onSidebarPanelWidthChange,
  ...props
}: FileListPanelProps) {
  return (
    <aside
      class={`sidebar-shell ${sidebarPanelCollapsed ? 'is-collapsed' : ''}`}
      style={{ width: `${sidebarPanelCollapsed ? 72 : sidebarPanelWidth}px` }}
    >
      <SidebarRail
        activeSection={sidebarActiveSection}
        collapsed={sidebarPanelCollapsed}
        onSelectSection={onSelectSidebarSection}
        onToggleCollapsed={onToggleSidebarPanelCollapsed}
      />

      {!sidebarPanelCollapsed && sidebarActiveSection === 'explorer' && (
        <SidebarExplorerContent
          {...props}
          sidebarPanelWidth={sidebarPanelWidth}
          onSidebarPanelWidthChange={onSidebarPanelWidthChange}
        />
      )}

      {!sidebarPanelCollapsed && sidebarActiveSection !== 'explorer' && (
        <SidebarSectionPlaceholder section={sidebarActiveSection} />
      )}
    </aside>
  )
}
