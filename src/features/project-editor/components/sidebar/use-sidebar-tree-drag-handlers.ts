import type { DropIndicatorPosition } from './drop-indicator'
import type { SidebarTreeRow } from './sidebar-tree-types'

function calculateDropPosition(
  rows: SidebarTreeRow[],
  hoveredPath: string,
  clientY: number,
  containerRef: { current: HTMLDivElement | null },
): DropIndicatorPosition | null {
  if (!containerRef.current) return null

  const rowElements = containerRef.current.querySelectorAll<HTMLButtonElement>('[data-sidebar-row-index]')
  let closestRow: HTMLButtonElement | null = null

  for (const rowEl of rowElements) {
    const rect = rowEl.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    if (clientY < midY) {
      if (!closestRow || rect.top < closestRow.getBoundingClientRect().top) {
        closestRow = rowEl
      }
    }
  }

  if (!closestRow) return null

  const hoveredRow = rows.find((r) => r.path === hoveredPath)
  if (!hoveredRow) return null

  if (hoveredRow.type === 'folder') {
    return { type: 'onFolder', folderPath: hoveredRow.path }
  }

  const beforeIndex = rows.findIndex((r) => r.path === hoveredPath)
  return { type: 'between', beforeIndex }
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

  if (dropPosition.type === 'onFolder' && dropPosition.folderPath !== undefined) {
    await onMoveFile?.(draggingPath, dropPosition.folderPath)
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

  if (dropPosition.type === 'between' && dropPosition.beforeIndex !== undefined) {
    const targetRow = rows[dropPosition.beforeIndex]
    if (targetRow) {
      const targetIndex = reorderedIds.indexOf(targetRow.path)
      if (targetIndex !== -1) {
        reorderedIds.splice(targetIndex, 0, draggingPath)
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