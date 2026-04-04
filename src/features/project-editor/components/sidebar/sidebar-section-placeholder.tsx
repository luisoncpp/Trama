import type { SidebarSection } from '../../project-editor-types'

function getSectionMessage(section: Exclude<SidebarSection, 'explorer'>): string {
  if (section === 'outline') {
    return 'Outline tools will be available in a future phase.'
  }

  if (section === 'lore') {
    return 'Lore tools will be available in a future phase.'
  }

  return 'Advanced project settings will be available in a future phase.'
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
