interface SidebarFolderContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number } | null
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

export function SidebarFolderContextMenu({ isOpen, position, onRename, onDelete, onClose }: SidebarFolderContextMenuProps) {
  if (!isOpen || !position) {
    return null
  }

  return (
    <div class="sidebar-context-menu-layer" onClick={onClose} onContextMenu={(event) => event.preventDefault()}>
      <div
        class="sidebar-context-menu"
        role="menu"
        aria-label="Folder actions"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onClick={(event) => event.stopPropagation()}
      >
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
      </div>
    </div>
  )
}
