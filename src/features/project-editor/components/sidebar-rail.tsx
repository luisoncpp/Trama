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
}

const SIDEBAR_ITEMS: SidebarRailItem[] = [
  { section: 'explorer', shortLabel: 'EX', title: 'Explorer' },
  { section: 'corkboard', shortLabel: 'CB', title: 'Corkboard (coming soon)' },
  { section: 'planner', shortLabel: 'PL', title: 'Planner (coming soon)' },
  { section: 'settings', shortLabel: 'ST', title: 'Project settings' },
]

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
            <span>{item.shortLabel}</span>
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
