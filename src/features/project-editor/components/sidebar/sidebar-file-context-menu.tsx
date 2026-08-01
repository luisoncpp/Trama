// @Architecture(descriptionShort="Right-click context menu for file rows")
import { SidebarContextMenuShell } from './sidebar-context-menu-shell'

function getRevealMenuLabel(): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
    return 'Reveal in Finder'
  }
  return 'Reveal in file explorer'
}

interface SidebarFileContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number } | null
  onEditTags: () => void
  onRename: () => void
  onDelete: () => void
  onReveal: () => void
  onClose: () => void
}

export function SidebarFileContextMenu({ isOpen, position, onEditTags, onRename, onDelete, onReveal, onClose }: SidebarFileContextMenuProps) {
  if (!isOpen || !position) {
    return null
  }

  return (
    <SidebarContextMenuShell position={position} ariaLabel="File actions" onClose={onClose}>
      <button type="button" class="sidebar-context-menu__item" role="menuitem" onClick={onReveal}>
        {getRevealMenuLabel()}
      </button>
      <button type="button" class="sidebar-context-menu__item" role="menuitem" onClick={onEditTags}>
        Edit tags
      </button>
      <button type="button" class="sidebar-context-menu__item" role="menuitem" onClick={onRename}>
        Rename
      </button>
      <button
        type="button"
        class="sidebar-context-menu__item sidebar-context-menu__item--danger"
        role="menuitem"
        onClick={onDelete}
      >
        Delete
      </button>
    </SidebarContextMenuShell>
  )
}
