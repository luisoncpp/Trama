// @Architecture(descriptionShort="Right-click context menu for folder rows")
import { SidebarContextMenuShell } from './sidebar-context-menu-shell'

function getRevealMenuLabel(): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
    return 'Reveal in Finder'
  }
  return 'Reveal in file explorer'
}

interface SidebarFolderContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number } | null
  onRename: () => void
  onDelete: () => void
  onReveal: () => void
  onClose: () => void
}

export function SidebarFolderContextMenu({ isOpen, position, onRename, onDelete, onReveal, onClose }: SidebarFolderContextMenuProps) {
  if (!isOpen || !position) {
    return null
  }

  return (
    <SidebarContextMenuShell position={position} ariaLabel="Folder actions" onClose={onClose}>
      <button type="button" class="sidebar-context-menu__item" role="menuitem" onClick={onRename}>
        Rename
      </button>
      <button type="button" class="sidebar-context-menu__item" role="menuitem" onClick={onReveal}>
        {getRevealMenuLabel()}
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
