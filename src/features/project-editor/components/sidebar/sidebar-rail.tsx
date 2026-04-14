import type { JSX } from 'preact'
import type { SidebarSection } from '../../project-editor-types'
import { LoreIcon, ManuscriptIcon, OutlineIcon, SettingsIcon, TransferIcon } from './sidebar-rail-icons.tsx'

interface SidebarRailProps {
  activeSection: SidebarSection
  collapsed: boolean
  focusModeEnabled: boolean
  onSelectSection: (section: SidebarSection) => void
  onToggleCollapsed: () => void
}

interface SidebarRailItem {
  section: SidebarSection
  title: string
  icon: () => JSX.Element
}

const SIDEBAR_ITEMS: SidebarRailItem[] = [
  { section: 'explorer', title: 'Manuscript explorer', icon: ManuscriptIcon },
  { section: 'outline', title: 'Outline', icon: OutlineIcon },
  { section: 'lore', title: 'Lore', icon: LoreIcon },
  { section: 'transfer', title: 'Import and export', icon: TransferIcon },
  { section: 'settings', title: 'Project settings', icon: SettingsIcon },
]

function RailItemLabel({ item }: { item: SidebarRailItem }): JSX.Element {
  const Icon = item.icon
  return <Icon />
}

export function SidebarRail({ activeSection, collapsed, focusModeEnabled, onSelectSection, onToggleCollapsed }: SidebarRailProps) {
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
        disabled={focusModeEnabled}
        aria-label={collapsed ? 'Expand sidebar panel' : 'Collapse sidebar panel'}
        title={focusModeEnabled ? 'Sidebar is locked while focus mode is active' : collapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {collapsed ? '>>' : '<<'}
      </button>
    </nav>
  )
}
