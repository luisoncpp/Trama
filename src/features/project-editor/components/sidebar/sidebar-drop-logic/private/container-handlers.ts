import type { DropIndicatorPosition } from '../../drop-indicator'
import type { SidebarTreeRow } from '../../sidebar-tree-logic'

export function createContainerDragOverHandler(
  rows: SidebarTreeRow[],
  draggingPath: string | null,
  setDropPosition: (position: DropIndicatorPosition | null) => void,
) {
  return (e: DragEvent) => {
    if (e.target !== e.currentTarget) return
    if (!draggingPath) return
    const sourceRow = rows.find((r) => r.path === draggingPath)
    if (sourceRow?.type === 'folder') {
      e.preventDefault()
      setDropPosition({ type: 'onSection' })
    }
  }
}

export function createContainerDropHandler(
  draggingPath: string | null,
  dropPosition: DropIndicatorPosition | null,
  onMoveFolder: ((sourcePath: string, targetParent: string) => Promise<void>) | undefined,
  setDraggingPath: (path: string | null) => void,
  setDropPosition: (position: DropIndicatorPosition | null) => void,
) {
  return (e: DragEvent) => {
    if (e.target !== e.currentTarget) return
    if (!draggingPath || dropPosition?.type !== 'onSection') return
    e.preventDefault()
    void onMoveFolder?.(draggingPath, '')
    setDraggingPath(null)
    setDropPosition(null)
  }
}
