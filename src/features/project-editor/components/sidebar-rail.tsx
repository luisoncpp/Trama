import type { JSX } from 'preact'
import type { SidebarSection } from '../project-editor-types'

interface SidebarRailProps {
  activeSection: SidebarSection
  collapsed: boolean
  onSelectSection: (section: SidebarSection) => void
  onToggleCollapsed: () => void
}

interface SidebarRailItem {
  section: SidebarSection
  shortLabel: string
  title: string
  icon?: () => JSX.Element
}

function GearIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  )
}

const SIDEBAR_ITEMS: SidebarRailItem[] = [
  { section: 'explorer', shortLabel: 'EX', title: 'Explorer' },
  { section: 'corkboard', shortLabel: 'CB', title: 'Corkboard (coming soon)' },
  { section: 'planner', shortLabel: 'PL', title: 'Planner (coming soon)' },
  { section: 'settings', shortLabel: 'ST', title: 'Project settings', icon: GearIcon },
]

function RailItemLabel({ item }: { item: SidebarRailItem }): JSX.Element {
  if (item.icon) {
    const Icon = item.icon
    return <Icon />
  }
  return <span>{item.shortLabel}</span>
}

export function SidebarRail({ activeSection, collapsed, onSelectSection, onToggleCollapsed }: SidebarRailProps) {
  return (
    <nav class="sidebar-rail" aria-label="Workspace sections">
      <div class="sidebar-rail__items">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.section}
            type="button"
            class={`sidebar-rail__item ${activeSection === item.section ? 'is-active' : ''}`}
            title={item.title}
            aria-label={item.title}
            onClick={() => onSelectSection(item.section)}
          >
            <RailItemLabel item={item} />
          </button>
        ))}
      </div>

      <button
        type="button"
        class="sidebar-rail__toggle"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar panel' : 'Collapse sidebar panel'}
        title={collapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {collapsed ? '>>' : '<<'}
      </button>
    </nav>
  )
}
