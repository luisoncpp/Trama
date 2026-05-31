import { useSidebarResponsiveCollapse } from '../components/sidebar/sidebar-explorer-hooks'
import { sidebarWidthPx } from './layout-metrics'

interface UseSidebarLayoutArgs {
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
}

interface SidebarLayoutState {
  effectiveCollapsed: boolean
  sidebarWidthPx: number
}

export function useSidebarLayout({ sidebarPanelCollapsed, sidebarPanelWidth }: UseSidebarLayoutArgs): SidebarLayoutState {
  const isResponsiveCollapsed = useSidebarResponsiveCollapse()
  const effectiveCollapsed = sidebarPanelCollapsed || isResponsiveCollapsed
  return {
    effectiveCollapsed,
    sidebarWidthPx: sidebarWidthPx(effectiveCollapsed, sidebarPanelWidth),
  }
}
