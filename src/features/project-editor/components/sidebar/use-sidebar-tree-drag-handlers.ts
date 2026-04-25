import type { DropIndicatorPosition } from './drop-indicator'
import type { SidebarTreeRow } from './sidebar-tree-types'
import { handleFileCrossFolderDrop, handleFileSameFolderReorder } from './sidebar-file-drop-logic'

const FOLDER_ZONE_RATIO = 0.5
const EDGE_ZONE_RATIO = 0.25

export function calculateDropPosition(
  rows: SidebarTreeRow[],
  draggingPath: string,
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

  const sourceRow = rows.find((r) => r.path === draggingPath)
  const isDraggingFolder = sourceRow?.type === 'folder'

  if (hoveredRow.type === 'folder') {
    if (heightFraction > EDGE_ZONE_RATIO && heightFraction < 1 - EDGE_ZONE_RATIO) {
      return { type: 'onFolder', targetPath: hoveredRow.path }
    }
  }

  if (isDraggingFolder) {
    return null
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
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
}

async function handleFolderDrop(
  sourceRow: SidebarTreeRow,
  draggingPath: string,
  dropPosition: DropIndicatorPosition,
  onMoveFolder: ((sourcePath: string, targetParent: string) => Promise<void>) | undefined,
): Promise<void> {
  if (dropPosition.type === 'onFolder' && dropPosition.targetPath !== undefined) {
    if (dropPosition.targetPath === sourceRow.path) return
    if (dropPosition.targetPath.startsWith(`${sourceRow.path}/`)) return
    await onMoveFolder?.(draggingPath, dropPosition.targetPath)
    return
  }
  if (dropPosition.type === 'onSection') {
    await onMoveFolder?.(draggingPath, '')
  }
}

async function handleFileDrop(
  rows: SidebarTreeRow[],
  sourceRow: SidebarTreeRow,
  draggingPath: string,
  dropPosition: DropIndicatorPosition,
  onMoveFile: ((sourcePath: string, targetFolder: string) => Promise<void>) | undefined,
  onReorderFiles: ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined,
): Promise<void> {
  if (dropPosition.type === 'onFolder' && dropPosition.targetPath !== undefined) {
    if (dropPosition.targetPath === sourceRow.path) return
    const parentPath = sourceRow.path.includes('/') ? sourceRow.path.split('/').slice(0, -1).join('/') : ''
    if (parentPath === dropPosition.targetPath) return
    await onMoveFile?.(draggingPath, dropPosition.targetPath)
    return
  }

  const sourceFolder = sourceRow.path.includes('/') ? sourceRow.path.split('/').slice(0, -1).join('/') : ''
  let targetFolder = sourceFolder
  let targetRow: SidebarTreeRow | undefined

  if ((dropPosition.type === 'before' || dropPosition.type === 'after') && dropPosition.targetIndex !== undefined) {
    targetRow = rows[dropPosition.targetIndex]
    if (targetRow) {
      targetFolder = targetRow.path.includes('/') ? targetRow.path.split('/').slice(0, -1).join('/') : ''
    }
  }

  if (targetFolder !== sourceFolder) {
    await handleFileCrossFolderDrop(rows, sourceRow, draggingPath, dropPosition, targetFolder, targetRow, onMoveFile, onReorderFiles)
    return
  }

  await handleFileSameFolderReorder(rows, sourceRow, draggingPath, dropPosition, sourceFolder, onReorderFiles)
}

async function executeDrop(
  rows: SidebarTreeRow[],
  draggingPath: string,
  dropPosition: DropIndicatorPosition,
  onMoveFile: ((sourcePath: string, targetFolder: string) => Promise<void>) | undefined,
  onMoveFolder: ((sourcePath: string, targetParent: string) => Promise<void>) | undefined,
  onReorderFiles: ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined,
): Promise<void> {
  const sourceRow = rows.find((r) => r.path === draggingPath)
  if (!sourceRow) return
  if (sourceRow.type === 'folder') {
    await handleFolderDrop(sourceRow, draggingPath, dropPosition, onMoveFolder)
    return
  }
  await handleFileDrop(rows, sourceRow, draggingPath, dropPosition, onMoveFile, onReorderFiles)
}

export function createContainerDragOverHandler(
  rows: SidebarTreeRow[],
  draggingPath: string | null,
  setDropPosition: (position: DropIndicatorPosition | null) => void,
) {
  return (e: DragEvent) => {
    const isOverRow = (e.target as Element).closest('[data-sidebar-row-index]') !== null
    if (!isOverRow && draggingPath) {
      const sourceRow = rows.find((r) => r.path === draggingPath)
      if (sourceRow?.type === 'folder') {
        e.preventDefault()
        setDropPosition({ type: 'onSection' })
      }
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
    const isOverRow = (e.target as Element).closest('[data-sidebar-row-index]') !== null
    if (!isOverRow && draggingPath && dropPosition?.type === 'onSection') {
      e.preventDefault()
      void onMoveFolder?.(draggingPath, '')
      setDraggingPath(null)
      setDropPosition(null)
    }
  }
}

export function useSidebarTreeDragHandlers({
  rows,
  draggingPath,
  dropPosition,
  setDraggingPath,
  setDropPosition,
  containerRef,
  onMoveFile,
  onMoveFolder,
  onReorderFiles,
}: UseSidebarTreeDragHandlersProps) {
  const handleDragStart = (_filePath: string, _event: DragEvent) => {
    setDraggingPath(_filePath)
    setDropPosition(null)
  }

  const handleDragOver = (filePath: string, event: DragEvent) => {
    if (!draggingPath) return
    const position = calculateDropPosition(rows, draggingPath, filePath, event.clientY, containerRef)
    setDropPosition(position)
  }

  const handleDrop = async (_filePath: string, _event: DragEvent) => {
    if (!draggingPath || !dropPosition) return
    await executeDrop(rows, draggingPath, dropPosition, onMoveFile, onMoveFolder, onReorderFiles)
    setDraggingPath(null)
    setDropPosition(null)
  }

  return { handleDragStart, handleDragOver, handleDrop }
}