import type { SidebarSection } from '../project-editor-types'

export function setSidebarSection(
  section: SidebarSection,
  sidebarState: { sidebarPanelCollapsed: boolean },
  layout: { focusModeEnabled: boolean },
  setSidebarActiveSection: (section: SidebarSection) => void,
  setSidebarPanelCollapsed: (collapsed: boolean) => void,
): void {
  setSidebarActiveSection(section)
  if (sidebarState.sidebarPanelCollapsed && !layout.focusModeEnabled) {
    setSidebarPanelCollapsed(false)
  }
}

export function toggleSidebarPanelCollapsed(
  layout: { focusModeEnabled: boolean },
  sidebarPanelCollapsed: boolean,
  setSidebarPanelCollapsed: (collapsed: boolean) => void,
): void {
  if (layout.focusModeEnabled) {
    setSidebarPanelCollapsed(true)
    return
  }
  setSidebarPanelCollapsed(!sidebarPanelCollapsed)
}

export function setSidebarPanelWidth(
  width: number,
  setSidebarPanelWidth: (width: number) => void,
): void {
  setSidebarPanelWidth(width)
}
