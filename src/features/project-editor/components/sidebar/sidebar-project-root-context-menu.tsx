// @Architecture(descriptionShort="Context menu UI for the project-root breadcrumb")
import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { SidebarContextMenuShell } from './sidebar-context-menu-shell'

function getRevealProjectMenuLabel(): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
    return 'Reveal in Finder'
  }
  return PROJECT_EDITOR_STRINGS.revealProjectInFileManager
}

interface SidebarProjectRootContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number } | null
  hasProject: boolean
  onSelectProject: () => void
  onRevealInFileManager: () => void
  onCloseProject: () => void
  onDismiss: () => void
}

export function SidebarProjectRootContextMenu({
  isOpen,
  position,
  hasProject,
  onSelectProject,
  onRevealInFileManager,
  onCloseProject,
  onDismiss,
}: SidebarProjectRootContextMenuProps) {
  if (!isOpen || !position) {
    return null
  }

  return (
    <SidebarContextMenuShell position={position} ariaLabel="Project actions" onClose={onDismiss}>
      <button type="button" class="sidebar-context-menu__item" role="menuitem" onClick={onSelectProject}>
        {PROJECT_EDITOR_STRINGS.selectProjectFolderMenu}
      </button>
      <button
        type="button"
        class="sidebar-context-menu__item"
        role="menuitem"
        disabled={!hasProject}
        onClick={onRevealInFileManager}
      >
        {getRevealProjectMenuLabel()}
      </button>
      <button
        type="button"
        class="sidebar-context-menu__item sidebar-context-menu__item--danger"
        role="menuitem"
        disabled={!hasProject}
        onClick={onCloseProject}
      >
        {PROJECT_EDITOR_STRINGS.closeProject}
      </button>
    </SidebarContextMenuShell>
  )
}
