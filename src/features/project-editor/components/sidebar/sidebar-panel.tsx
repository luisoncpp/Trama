import type { SidebarSection } from '../../project-editor-types'
import { SidebarRail } from './sidebar-rail'
import { SidebarExplorerContent } from './sidebar-explorer-content'
import { SidebarSectionPlaceholder } from './sidebar-section-placeholder'
import { SidebarSettingsContent } from './sidebar-settings-content.tsx'

interface SidebarPanelProps {
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
  onPickFolder: () => void
}

export function SidebarPanel({
  sidebarActiveSection,
  sidebarPanelCollapsed,
  sidebarPanelWidth,
  onSelectSidebarSection,
  onToggleSidebarPanelCollapsed,
  onSidebarPanelWidthChange,
  ...props
}: SidebarPanelProps) {
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

      {!sidebarPanelCollapsed && sidebarActiveSection === 'explorer' && <SidebarExplorerContent {...props} />}

      {!sidebarPanelCollapsed && sidebarActiveSection === 'settings' && (
        <SidebarSettingsContent
          panelWidth={sidebarPanelWidth}
          onPanelWidthChange={onSidebarPanelWidthChange}
        />
      )}

      {!sidebarPanelCollapsed &&
        (sidebarActiveSection === 'corkboard' || sidebarActiveSection === 'planner') && (
          <SidebarSectionPlaceholder section={sidebarActiveSection} />
        )}
    </aside>
  )
}