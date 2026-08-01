// @Architecture(descriptionShort="Shared fixed context-menu shell with viewport clamp")
import type { ComponentChildren } from 'preact'
import type { ContextMenuPoint } from './clamp-context-menu-position'
import { useClampedContextMenuPosition } from './use-clamped-context-menu-position'

interface SidebarContextMenuShellProps {
  position: ContextMenuPoint
  ariaLabel: string
  onClose: () => void
  children: ComponentChildren
}

export function SidebarContextMenuShell({ position, ariaLabel, onClose, children }: SidebarContextMenuShellProps) {
  const { menuRef, style } = useClampedContextMenuPosition(position)

  return (
    <div class="sidebar-context-menu-layer" onClick={onClose} onContextMenu={(event) => event.preventDefault()}>
      <div
        ref={menuRef}
        class="sidebar-context-menu"
        role="menu"
        aria-label={ariaLabel}
        style={style}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
