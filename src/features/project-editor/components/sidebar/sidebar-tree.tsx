import { useMemo, useRef, useState } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { filterSidebarTree } from './sidebar-filter-logic'
import { buildSidebarTree, getVisibleSidebarRows } from './sidebar-tree-logic'
import { useSidebarTreeExpandedFolders } from './use-sidebar-tree-expanded-folders'
import { SidebarTreeRowButton } from './sidebar-tree-row-button'
import { DropIndicator, type DropIndicatorPosition } from './drop-indicator'
import type { SidebarTreeRow } from './sidebar-tree-types'

export interface SidebarTreeProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => Promise<void>
  filterQuery: string
  onFileContextMenu?: (filePath: string, event: MouseEvent) => void
  onFolderContextMenu?: (folderPath: string, event: MouseEvent) => void
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
}

export interface SidebarTreeRowsProps {
  rows: SidebarTreeRow[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => Promise<void>
  onToggleFolder: (path: string, expanded: boolean) => void
  containerRef: { current: HTMLDivElement | null }
  onFileContextMenu?: (filePath: string, event: MouseEvent) => void
  onFolderContextMenu?: (folderPath: string, event: MouseEvent) => void
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  dragState: {
    draggingPath: string | null
    dropPosition: DropIndicatorPosition | null
    setDraggingPath: (path: string | null) => void
    setDropPosition: (position: DropIndicatorPosition | null) => void
  }
}

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

export function SidebarTreeRows({
  rows,
  selectedPath,
  loadingDocument,
  onSelectFile,
  onToggleFolder,
  containerRef,
  onFileContextMenu,
  onFolderContextMenu,
  onReorderFiles,
  onMoveFile,
  dragState,
}: SidebarTreeRowsProps) {
  const { draggingPath, dropPosition, setDraggingPath, setDropPosition } = dragState

  const handleDragStart = (filePath: string, _event: DragEvent) => {
    setDraggingPath(filePath)
    setDropPosition(null)
  }

  const handleDragOver = (filePath: string, event: DragEvent) => {
    if (!draggingPath) return
    const position = calculateDropPosition(rows, filePath, event.clientY, containerRef)
    setDropPosition(position)
  }

  const handleDrop = async (filePath: string, _event: DragEvent) => {
    if (!draggingPath || !dropPosition) return

    const sourceRow = rows.find((r) => r.path === draggingPath)
    if (!sourceRow || sourceRow.type !== 'file') return

    if (dropPosition.type === 'onFolder' && dropPosition.folderPath !== undefined) {
      await onMoveFile?.(draggingPath, dropPosition.folderPath)
      setDraggingPath(null)
      setDropPosition(null)
      return
    }

    const folderPath = sourceRow.path.includes('/')
      ? sourceRow.path.split('/').slice(0, -1).join('/')
      : ''

    const reorderedIds = rows
      .filter((r) => r.type === 'file')
      .map((r) => r.path)

    const sourceIndex = reorderedIds.indexOf(draggingPath)
    if (sourceIndex === -1) return

    reorderedIds.splice(sourceIndex, 1)

    if (dropPosition.type === 'between' && dropPosition.beforeIndex !== undefined) {
      const targetIndex = reorderedIds.indexOf(filePath)
      if (targetIndex !== -1) {
        reorderedIds.splice(targetIndex, 0, draggingPath)
      }
    }

    await onReorderFiles?.(folderPath, reorderedIds)
    setDraggingPath(null)
    setDropPosition(null)
  }

  return (
    <>
      {rows.map((row, index) => (
        <SidebarTreeRowButton
          key={row.nodeId}
          row={row}
          index={index}
          selectedPath={selectedPath}
          loadingDocument={loadingDocument}
          onSelectFile={onSelectFile}
          onToggleFolder={onToggleFolder}
          containerRef={containerRef}
          onFileContextMenu={onFileContextMenu}
          onFolderContextMenu={onFolderContextMenu}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}
      <DropIndicator position={dropPosition} />
    </>
  )
}

export function SidebarTree({
  visibleFiles,
  selectedPath,
  loadingDocument,
  onSelectFile,
  filterQuery,
  onFileContextMenu,
  onFolderContextMenu,
  onReorderFiles,
  onMoveFile,
}: SidebarTreeProps) {
  const tree = useMemo(() => buildSidebarTree(visibleFiles), [visibleFiles])
  const filterResult = useMemo(() => filterSidebarTree(tree, filterQuery), [filterQuery, tree])
  const [setFolderExpanded, effectiveExpandedFolders] = useSidebarTreeExpandedFolders(
    tree,
    selectedPath,
    filterQuery,
    filterResult.autoExpandFolderPaths,
  )
  const rows = useMemo(
    () =>
      getVisibleSidebarRows(
        tree,
        new Set(effectiveExpandedFolders),
        filterResult.query ? filterResult.visibleNodePaths : undefined,
      ),
    [effectiveExpandedFolders, filterResult, tree],
  )
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hasFilterQuery = filterResult.query.length > 0
  const [draggingPath, setDraggingPath] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropIndicatorPosition | null>(null)

  if (visibleFiles.length === 0 && !hasFilterQuery) {
    return <p class='file-tree__empty'>{PROJECT_EDITOR_STRINGS.noMarkdownFiles}</p>
  }

  if (rows.length === 0 && hasFilterQuery) {
    return <p class='file-tree__empty'>No files match &quot;{filterResult.query}&quot;.</p>
  }

  return (
    <div class='file-tree sidebar-tree' ref={containerRef} role='tree' aria-label='Project files'>
      <SidebarTreeRows
        rows={rows}
        selectedPath={selectedPath}
        loadingDocument={loadingDocument}
        onSelectFile={onSelectFile}
        onToggleFolder={setFolderExpanded}
        containerRef={containerRef}
        onFileContextMenu={onFileContextMenu}
        onFolderContextMenu={onFolderContextMenu}
        onReorderFiles={onReorderFiles}
        onMoveFile={onMoveFile}
        dragState={{ draggingPath, dropPosition, setDraggingPath, setDropPosition }}
      />
    </div>
  )
}