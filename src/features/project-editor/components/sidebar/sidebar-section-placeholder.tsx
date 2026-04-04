import type { SidebarSection } from '../../project-editor-types'

function getSectionMessage(section: Exclude<SidebarSection, 'explorer'>): string {
  if (section === 'corkboard') {
    return 'Corkboard estara disponible en una fase posterior.'
  }

  if (section === 'planner') {
    return 'Planner estara disponible en una fase posterior.'
  }

  return 'Project settings avanzados estaran disponibles en una fase posterior.'
}

export function SidebarSectionPlaceholder({ section }: { section: Exclude<SidebarSection, 'explorer'> }) {
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar sidebar-placeholder">
        <p class="workspace-panel__eyebrow">Workspace</p>
        <h2 class="workspace-panel__title">{section}</h2>
        <p class="file-tree__empty">{getSectionMessage(section)}</p>
      </aside>
    </div>
  )
}
