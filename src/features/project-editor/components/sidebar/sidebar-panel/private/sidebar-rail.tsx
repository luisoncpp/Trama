// @Architecture(descriptionShort="Section rail and collapse toggle")
import { Fragment, type JSX } from 'preact'
import type { SidebarSection } from '../../../../project-editor-types'
import { useEditorActions } from '../../../../project-editor-actions-context.tsx'
import { useSidebarState } from '../../sidebar-state-context.tsx'
import { ContentsIcon, LoreIcon, ManuscriptIcon, OutlineIcon, SearchIcon, SettingsIcon, TemplatesIcon, TransferIcon, HelpIcon, CollapseLeftIcon, ExpandRightIcon } from './sidebar-rail-icons.tsx'

interface SidebarRailProps {
  collapsed: boolean
  onOpenHelp: () => void
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
  { section: 'templates', title: 'Templates', icon: TemplatesIcon },
  { section: 'contents', title: 'Current Document\'s Table of contents', icon: ContentsIcon },
  { section: 'search', title: 'Global search', icon: SearchIcon },
  { section: 'transfer', title: 'Import and export', icon: TransferIcon },
  { section: 'settings', title: 'Project settings', icon: SettingsIcon },
]

function RailItemLabel({ item }: { item: SidebarRailItem }): JSX.Element {
  const Icon = item.icon
  return <Icon />
}

export function SidebarRail({ collapsed, onOpenHelp }: SidebarRailProps) {
  const { setSidebarSection, toggleSidebarPanelCollapsed } = useEditorActions()
  const { sidebarActiveSection, focusModeEnabled } = useSidebarState()

  return (
    <nav class="sidebar-rail" aria-label="Workspace sections">
      <div class="sidebar-rail__items">
        {SIDEBAR_ITEMS.map((item) => (
          <Fragment key={item.section}>
            {item.section === 'contents' ? <div class="sidebar-rail__separator" role="separator" /> : null}
            <button
              type="button"
              class={`sidebar-rail__item ${sidebarActiveSection === item.section ? 'is-active' : ''}`}
              title={item.title}
              aria-label={item.title}
              onClick={() => setSidebarSection(item.section)}
            >
              <RailItemLabel item={item} />
            </button>
          </Fragment>
        ))}
      </div>

      <div class="sidebar-rail__bottom">
        <button
          type="button"
          class="sidebar-rail__item"
          title="Help"
          aria-label="Help"
          onClick={onOpenHelp}
        >
          <HelpIcon />
        </button>

        <button
          type="button"
          class="sidebar-rail__toggle"
          onClick={toggleSidebarPanelCollapsed}
          disabled={focusModeEnabled}
          aria-label={collapsed ? 'Expand sidebar panel' : 'Collapse sidebar panel'}
          title={focusModeEnabled ? 'Sidebar is locked while focus mode is active' : collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? <ExpandRightIcon /> : <CollapseLeftIcon />}
        </button>
      </div>
    </nav>
  )
}
