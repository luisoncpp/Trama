import type { DropIndicatorPosition } from './drop-indicator'
import type { SidebarTreeRow } from './sidebar-tree-types'

const FOLDER_ZONE_RATIO = 0.5
const EDGE_ZONE_RATIO = 0.25

function calculateDropPosition(
  rows: SidebarTreeRow[],
  hoveredPath: string,
  clientY: number,
  containerRef: { current: HTMLDivElement | null },
): DropIndicatorPosition | null {
  if (!containerRef.current) return null

  const rowElements = containerRef.current.querySelectorAll<HTMLButtonElement>('[data-sidebar-row-index]')
  const hoveredEl = Array.from(rowElements).find((el) => el.getAttribute('data-path') === hoveredPath)
  if (!hoveredEl) return null

  const rect = hoveredEl.getBoundingClientRect()
  const relativeY = clientY - rect.top
  const heightFraction = relativeY / rect.height

  const hoveredRow = rows.find((r) => r.path === hoveredPath)
  if (!hoveredRow) return null

  if (hoveredRow.type === 'folder') {
    if (heightFraction > EDGE_ZONE_RATIO && heightFraction < 1 - EDGE_ZONE_RATIO) {
      return { type: 'onFolder', targetPath: hoveredRow.path }
    }
  }

  const hoveredIndex = rows.findIndex((r) => r.path === hoveredPath)
  if (hoveredIndex === -1) return null

  if (heightFraction < FOLDER_ZONE_RATIO) {
    return { type: 'before', targetIndex: hoveredIndex, targetPath: hoveredRow.path }
  }

  return { type: 'after', targetIndex: hoveredIndex, targetPath: hoveredRow.path }
}

interface UseSidebarTreeDragHandlersProps {
  rows: SidebarTreeRow[]
  draggingPath: string | null
  dropPosition: DropIndicatorPosition | null
  setDraggingPath: (path: string | null) => void
  setDropPosition: (position: DropIndicatorPosition | null) => void
  containerRef: { current: HTMLDivElement | null }
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
}

async function executeDrop(
  rows: SidebarTreeRow[],
  draggingPath: string,
  dropPosition: DropIndicatorPosition,
  onMoveFile: ((sourcePath: string, targetFolder: string) => Promise<void>) | undefined,
  onReorderFiles: ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined,
): Promise<void> {
  const sourceRow = rows.find((r) => r.path === draggingPath)
  if (!sourceRow || sourceRow.type !== 'file') return

  if (dropPosition.type === 'onFolder' && dropPosition.targetPath !== undefined) {
    if (dropPosition.targetPath === sourceRow.path) return
    const parentPath = sourceRow.path.includes('/') ? sourceRow.path.split('/').slice(0, -1).join('/') : ''
    if (parentPath === dropPosition.targetPath) return
    await onMoveFile?.(draggingPath, dropPosition.targetPath)
    return
  }

  const folderPath = sourceRow.path.includes('/')
    ? sourceRow.path.split('/').slice(0, -1).join('/')
    : ''
  const siblingFiles = rows.filter(
    (r) => r.type === 'file' && r.depth === sourceRow.depth && (folderPath === '' ? !r.path.includes('/') : r.path.startsWith(`${folderPath}/`)),
  )
  const reorderedIds = siblingFiles.map((r) => r.path)
  const sourceIndex = reorderedIds.indexOf(draggingPath)
  if (sourceIndex === -1) return
  reorderedIds.splice(sourceIndex, 1)

  if (dropPosition.type === 'before' && dropPosition.targetIndex !== undefined) {
    const targetRow = rows[dropPosition.targetIndex]
    if (targetRow) {
      const targetIndex = reorderedIds.indexOf(targetRow.path)
      if (targetIndex !== -1) {
        reorderedIds.splice(targetIndex, 0, draggingPath)
      }
    }
  } else if (dropPosition.type === 'after' && dropPosition.targetIndex !== undefined) {
    const targetRow = rows[dropPosition.targetIndex]
    if (targetRow) {
      const targetIndex = reorderedIds.indexOf(targetRow.path)
      if (targetIndex !== -1) {
        reorderedIds.splice(targetIndex + 1, 0, draggingPath)
      }
    }
  }

  await onReorderFiles?.(folderPath, reorderedIds)
}

export function useSidebarTreeDragHandlers({
  rows,
  draggingPath,
  dropPosition,
  setDraggingPath,
  setDropPosition,
  containerRef,
  onMoveFile,
  onReorderFiles,
}: UseSidebarTreeDragHandlersProps) {
  const handleDragStart = (_filePath: string, _event: DragEvent) => {
    setDraggingPath(_filePath)
    setDropPosition(null)
  }

  const handleDragOver = (filePath: string, event: DragEvent) => {
    if (!draggingPath) return
    const position = calculateDropPosition(rows, filePath, event.clientY, containerRef)
    setDropPosition(position)
  }

  const handleDrop = async (_filePath: string, _event: DragEvent) => {
    if (!draggingPath || !dropPosition) return
    await executeDrop(rows, draggingPath, dropPosition, onMoveFile, onReorderFiles)
    setDraggingPath(null)
    setDropPosition(null)
  }

  return { handleDragStart, handleDragOver, handleDrop }
}