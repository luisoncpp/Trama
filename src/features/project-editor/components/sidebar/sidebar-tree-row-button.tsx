import type { SidebarTreeRow } from './sidebar-tree-types'
import { findParentRowIndex } from './sidebar-tree-logic'
import { TreeChevron, TreeNodeIcon } from './sidebar-tree-icons'

interface SidebarTreeRowButtonProps {
  row: SidebarTreeRow
  index: number
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => Promise<void>
  onToggleFolder: (path: string, expanded: boolean) => void
  containerRef: { current: HTMLDivElement | null }
  onFileContextMenu?: (filePath: string, event: MouseEvent) => void
  onFolderContextMenu?: (folderPath: string, event: MouseEvent) => void
  onDragStart?: (filePath: string, event: DragEvent) => void
  onDragOver?: (filePath: string, event: DragEvent) => void
  onDrop?: (filePath: string, event: DragEvent) => void
}

function focusRowInContainer(containerRef: { current: HTMLDivElement | null }, rows: SidebarTreeRow[], index: number) {
  if (index < 0 || index >= rows.length) return
  const selector = `[data-sidebar-row-index=\"${index}\"]`
  containerRef.current?.querySelector<HTMLButtonElement>(selector)?.focus()
}

export function handleTreeRowKeyDown(
  event: KeyboardEvent,
  index: number,
  rows: SidebarTreeRow[],
  onToggleFolder: (path: string, expanded: boolean) => void,
  onSelectFile: (filePath: string) => Promise<void>,
  containerRef: { current: HTMLDivElement | null },
) {
  const row = rows[index]
  if (!row) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    focusRowInContainer(containerRef, rows, index + 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    focusRowInContainer(containerRef, rows, index - 1)
  } else if (event.key === 'ArrowRight' && row.type === 'folder') {
    event.preventDefault()
    if (!row.isExpanded) {
      onToggleFolder(row.path, true)
    } else {
      focusRowInContainer(containerRef, rows, index + 1)
    }
  } else if (event.key === 'ArrowLeft' && row.type === 'folder') {
    event.preventDefault()
    if (row.isExpanded) {
      onToggleFolder(row.path, false)
    } else {
      focusRowInContainer(containerRef, rows, findParentRowIndex(rows, index))
    }
  } else if (event.key === ' ' && row.type === 'folder') {
    event.preventDefault()
    onToggleFolder(row.path, !row.isExpanded)
  } else if (event.key === 'Enter' && row.type === 'file') {
    event.preventDefault()
    void onSelectFile(row.path)
  }
}

export function SidebarTreeRowButton({
  row, index, selectedPath, loadingDocument, onSelectFile, onToggleFolder, containerRef,
  onFileContextMenu, onFolderContextMenu, onDragStart, onDragOver, onDrop,
}: SidebarTreeRowButtonProps) {
  const isFolder = row.type === 'folder'

  return (
    <button
      type='button'
      role='treeitem'
      aria-expanded={isFolder ? row.isExpanded : undefined}
      aria-level={row.depth + 1}
      data-sidebar-row-index={index}
      disabled={loadingDocument}
      class={`sidebar-tree__row ${isFolder ? 'is-folder' : 'is-file'} ${selectedPath === row.path ? 'is-active' : ''}`}
      style={{ paddingLeft: `${12 + row.depth * 16}px` }}
      onClick={() => (isFolder ? onToggleFolder(row.path, !row.isExpanded) : void onSelectFile(row.path))}
      onContextMenu={(e) => { e.preventDefault(); (isFolder ? onFolderContextMenu : onFileContextMenu)?.(row.path, e) }}
      onKeyDown={(e) => handleTreeRowKeyDown(e, index, [row], onToggleFolder, onSelectFile, containerRef)}
      draggable={!isFolder}
      onDragStart={(e) => { if (!isFolder) onDragStart?.(row.path, e) }}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(row.path, e) }}
      onDragEnter={(e) => { e.preventDefault(); onDragOver?.(row.path, e) }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(row.path, e) }}
    >
      {isFolder ? <TreeChevron expanded={row.isExpanded} /> : <span class='sidebar-tree__chevron is-file' />}
      <TreeNodeIcon type={row.type} />
      <span class='file-tree__item-label'>{row.name}</span>
    </button>
  )
}