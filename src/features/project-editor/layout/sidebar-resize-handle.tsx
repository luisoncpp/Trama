import type { RefObject } from 'preact'
import { clampSidebarWidth } from './layout-metrics'

interface SidebarResizeHandleProps {
  workspaceRef: RefObject<HTMLElement>
  onWidthChange: (width: number) => void
}

export function SidebarResizeHandle({ workspaceRef, onWidthChange }: SidebarResizeHandleProps) {
  const updateWidthFromClientX = (clientX: number) => {
    const workspace = workspaceRef.current
    if (!workspace) return
    const bounds = workspace.getBoundingClientRect()
    onWidthChange(clampSidebarWidth(clientX - bounds.left))
  }

  const startResizeDrag = (startClientX: number) => {
    updateWidthFromClientX(startClientX)
    const onMouseMove = (event: MouseEvent) => updateWidthFromClientX(event.clientX)
    const stopDrag = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDrag)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
  }

  return (
    <div
      class="sidebar-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onMouseDown={(event) => {
        event.preventDefault()
        startResizeDrag(event.clientX)
      }}
    />
  )
}
