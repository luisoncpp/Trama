import { useMemo, useRef, useState } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { filterSidebarTree } from './sidebar-filter-logic'
import { buildSidebarTree, getVisibleSidebarRows, sortTreeRowsByOrder } from './sidebar-tree-logic'
import {
  createContainerDragOverHandler,
  createContainerDropHandler,
} from './sidebar-drop-logic'
import { useSidebarTreeRowsDrag } from './use-sidebar-tree-rows-drag'
import { SidebarTreeRowButton } from './sidebar-tree-row-button'
import type { DropIndicatorPosition } from './drop-indicator'
import type { SidebarTreeRow } from './sidebar-tree-logic'

export interface SidebarTreeProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => Promise<void>
  filterQuery: string
  corkboardOrder?: Record<string, string[]>
  onFileContextMenu?: (filePath: string, event: MouseEvent) => void
  onFolderContextMenu?: (folderPath: string, event: MouseEvent) => void
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
  expandedFolders: string[]
  onToggleFolder: (path: string, expanded: boolean) => void
  isLoading?: boolean
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
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
  dragState: {
    draggingPath: string | null
    dropPosition: DropIndicatorPosition | null
    setDraggingPath: (path: string | null) => void
    setDropPosition: (position: DropIndicatorPosition | null) => void
  }
}

function useSidebarTreeDragState() {
  const [draggingPath, setDraggingPath] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropIndicatorPosition | null>(null)
  return { draggingPath, dropPosition, setDraggingPath, setDropPosition }
}

function renderSidebarTreeEmptyState(
  visibleFiles: string[],
  hasFilterQuery: boolean,
  query: string,
): preact.JSX.Element | null {
  if (visibleFiles.length === 0 && !hasFilterQuery) {
    return <p class='file-tree__empty'>{PROJECT_EDITOR_STRINGS.noMarkdownFiles}</p>
  }
  if (hasFilterQuery) {
    return <p class='file-tree__empty'>No files match &quot;{query}&quot;.</p>
  }
  return null
}

function useSidebarTreeRows(
  visibleFiles: string[],
  expandedFolders: string[],
  filterQuery: string,
  corkboardOrder?: Record<string, string[]>,
) {
  const tree = useMemo(() => buildSidebarTree(visibleFiles), [visibleFiles])
  const filterResult = useMemo(() => filterSidebarTree(tree, filterQuery), [filterQuery, tree])
  const rawRows = useMemo(
    () =>
      getVisibleSidebarRows(
        tree,
        new Set(expandedFolders),
        filterResult.query ? filterResult.visibleNodePaths : undefined,
      ),
    [expandedFolders, filterResult, tree],
  )
  const rows = useMemo(
    () => (corkboardOrder ? sortTreeRowsByOrder(rawRows, corkboardOrder) : rawRows),
    [rawRows, corkboardOrder],
  )
  return { rows, filterResult }
}

function getDropIndicatorClass(
  dropPosition: DropIndicatorPosition | null,
  index: number,
  path: string,
): string {
  if (!dropPosition || dropPosition.targetIndex !== index && dropPosition.targetPath !== path) return ''
  if (dropPosition.type === 'before' && dropPosition.targetIndex === index) return ' is-drop-before'
  if (dropPosition.type === 'after' && dropPosition.targetIndex === index) return ' is-drop-after'
  if (dropPosition.type === 'onFolder' && dropPosition.targetPath === path) return ' is-drop-onFolder'
  return ''
}

function SidebarTreeRows({
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
  onMoveFolder,
  dragState,
}: SidebarTreeRowsProps) {
  const { draggingPath, dropPosition, setDraggingPath, setDropPosition } = dragState
  const { handleDragStart, handleDragOver, handleDrop } = useSidebarTreeRowsDrag({
    rows,
    draggingPath,
    dropPosition,
    setDraggingPath,
    setDropPosition,
    containerRef,
    onMoveFile,
    onMoveFolder,
    onReorderFiles,
  })

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
          dropIndicatorClass={getDropIndicatorClass(dropPosition, index, row.path)}
        />
      ))}
    </>
  )
}

export function SidebarTree({
  visibleFiles,
  selectedPath,
  loadingDocument,
  onSelectFile,
  filterQuery,
  corkboardOrder,
  onFileContextMenu,
  onFolderContextMenu,
  onReorderFiles,
  onMoveFile,
  onMoveFolder,
  expandedFolders,
  onToggleFolder,
  isLoading,
}: SidebarTreeProps) {
  const { rows, filterResult } = useSidebarTreeRows(visibleFiles, expandedFolders, filterQuery, corkboardOrder)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hasFilterQuery = filterResult.query.length > 0
  const { draggingPath, dropPosition, setDraggingPath, setDropPosition } = useSidebarTreeDragState()
  const emptyState = renderSidebarTreeEmptyState(visibleFiles, hasFilterQuery && rows.length === 0, filterResult.query)

  if (emptyState) {
    return emptyState
  }

  return (
    <div
      class={`file-tree sidebar-tree${isLoading ? ' is-loading' : ''}`}
      ref={containerRef}
      role='tree'
      aria-label='Project files'
      onDragOver={createContainerDragOverHandler(rows, draggingPath, setDropPosition)}
      onDrop={createContainerDropHandler(draggingPath, dropPosition, onMoveFolder, setDraggingPath, setDropPosition)}
    >
      <SidebarTreeRows
        rows={rows}
        selectedPath={selectedPath}
        loadingDocument={loadingDocument}
        onSelectFile={onSelectFile}
        onToggleFolder={onToggleFolder}
        containerRef={containerRef}
        onFileContextMenu={onFileContextMenu}
        onFolderContextMenu={onFolderContextMenu}
        onReorderFiles={onReorderFiles}
        onMoveFile={onMoveFile}
        onMoveFolder={onMoveFolder}
        dragState={{ draggingPath, dropPosition, setDraggingPath, setDropPosition }}
      />
    </div>
  )
}
