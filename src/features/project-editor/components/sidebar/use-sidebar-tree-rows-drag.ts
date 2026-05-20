import { useEffect, useRef } from 'preact/hooks'
import { calculateDropPosition, executeDrop, buildRowGeometries } from './sidebar-drop-logic'
import type { RowGeometry } from './sidebar-drop-logic'
import type { DropIndicatorPosition } from './drop-indicator'
import type { SidebarTreeRow } from './sidebar-tree-logic'

interface UseSidebarTreeRowsDragProps {
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

export function useSidebarTreeRowsDrag({
  rows,
  draggingPath,
  dropPosition,
  setDraggingPath,
  setDropPosition,
  containerRef,
  onMoveFile,
  onMoveFolder,
  onReorderFiles,
}: UseSidebarTreeRowsDragProps) {
  const rowGeometriesRef = useRef<RowGeometry[]>([])
  const scrollTopRef = useRef<number>(0)

  function rebuildGeometries() {
    if (!containerRef.current) return
    rowGeometriesRef.current = buildRowGeometries(containerRef.current, rows)
    scrollTopRef.current = containerRef.current.scrollTop
  }

  useEffect(() => {
    if (!draggingPath || !containerRef.current) return
    const container = containerRef.current
    const onScroll = () => { if (container.scrollTop !== scrollTopRef.current) rebuildGeometries() }
    container.addEventListener('scroll', onScroll)
    return () => container.removeEventListener('scroll', onScroll)
  }, [draggingPath])

  const handleDragStart = (filePath: string, _event: DragEvent) => {
    setDraggingPath(filePath)
    setDropPosition(null)
    rebuildGeometries()
  }

  const handleDragOver = (filePath: string, event: DragEvent) => {
    if (!draggingPath) return
    if (containerRef.current && containerRef.current.scrollTop !== scrollTopRef.current) rebuildGeometries()
    setDropPosition(calculateDropPosition(rows, draggingPath, filePath, event.clientY, rowGeometriesRef.current))
  }

  const handleDrop = async (_filePath: string, _event: DragEvent) => {
    if (!draggingPath || !dropPosition) return
    await executeDrop({ rows, draggingPath, dropPosition, onMoveFile, onMoveFolder, onReorderFiles })
    setDraggingPath(null)
    setDropPosition(null)
  }

  return { handleDragStart, handleDragOver, handleDrop }
}
