import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { buildSidebarTree, getAncestorFolderPaths, getVisibleSidebarRows } from './sidebar-tree-logic'
import { TreeChevron, TreeNodeIcon } from './sidebar-tree-icons'

interface SidebarTreeProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
}

interface SidebarTreeRowsProps {
  rows: ReturnType<typeof getVisibleSidebarRows>
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  onToggleFolder: (path: string, expanded: boolean) => void
  containerRef: { current: HTMLDivElement | null }
}

interface SidebarTreeRowButtonProps {
  row: ReturnType<typeof getVisibleSidebarRows>[number]
  index: number
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  onToggleFolder: (path: string, expanded: boolean) => void
  onRowKeyDown: (event: KeyboardEvent, index: number) => void
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function findParentRowIndex(rows: ReturnType<typeof getVisibleSidebarRows>, index: number): number {
  const currentDepth = rows[index]?.depth ?? 0

  for (let i = index - 1; i >= 0; i -= 1) {
    if (rows[i].depth < currentDepth) {
      return i
    }
  }

  return -1
}

function useExpandedFolders(tree: ReturnType<typeof buildSidebarTree>, selectedPath: string | null): [string[], (path: string, expanded: boolean) => void] {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])

  useEffect(() => {
    const folderPaths = new Set(
      Object.values(tree.nodesById)
        .filter((node) => node.type === 'folder')
        .map((node) => node.path),
    )

    const rootFolders = tree.rootIds
      .map((id) => tree.nodesById[id])
      .filter((node) => node?.type === 'folder')
      .map((node) => node.path)

    const selectedAncestors = selectedPath ? getAncestorFolderPaths(selectedPath) : []

    setExpandedFolders((prev) => {
      const previousValid = prev.filter((path) => folderPaths.has(path))
      const seed = previousValid.length > 0 ? previousValid : rootFolders
      return unique([...seed, ...selectedAncestors])
    })
  }, [selectedPath, tree])

  const setFolderExpanded = (path: string, expanded: boolean) => {
    setExpandedFolders((current) => {
      if (expanded) {
        return unique([...current, path])
      }

      return current.filter((entry) => entry !== path)
    })
  }

  return [expandedFolders, setFolderExpanded]
}

function useRowFocus(containerRef: { current: HTMLDivElement | null }, rows: ReturnType<typeof getVisibleSidebarRows>) {
  return (index: number) => {
    if (index < 0 || index >= rows.length) {
      return
    }

    const selector = `[data-sidebar-row-index="${index}"]`
    const element = containerRef.current?.querySelector<HTMLButtonElement>(selector)
    element?.focus()
  }
}

function useRowKeyDownHandler(params: {
  rows: ReturnType<typeof getVisibleSidebarRows>
  focusRow: (index: number) => void
  onToggleFolder: (path: string, expanded: boolean) => void
  onSelectFile: (filePath: string) => void
}) {
  return (event: KeyboardEvent, index: number) => {
    const row = params.rows[index]
    if (!row) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      params.focusRow(index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      params.focusRow(index - 1)
    } else if (event.key === 'ArrowRight' && row.type === 'folder') {
      event.preventDefault()
      if (!row.isExpanded) {
        params.onToggleFolder(row.path, true)
      } else {
        params.focusRow(index + 1)
      }
    } else if (event.key === 'ArrowLeft' && row.type === 'folder') {
      event.preventDefault()
      if (row.isExpanded) {
        params.onToggleFolder(row.path, false)
      } else {
        params.focusRow(findParentRowIndex(params.rows, index))
      }
    } else if (event.key === ' ' && row.type === 'folder') {
      event.preventDefault()
      params.onToggleFolder(row.path, !row.isExpanded)
    } else if (event.key === 'Enter' && row.type === 'file') {
      event.preventDefault()
      params.onSelectFile(row.path)
    }
  }
}

function SidebarTreeRowButton({
  row,
  index,
  selectedPath,
  loadingDocument,
  onSelectFile,
  onToggleFolder,
  onRowKeyDown,
}: SidebarTreeRowButtonProps) {
  return (
    <button
      type="button"
      role="treeitem"
      aria-expanded={row.type === 'folder' ? row.isExpanded : undefined}
      aria-level={row.depth + 1}
      data-sidebar-row-index={index}
      disabled={loadingDocument}
      class={`sidebar-tree__row ${row.type === 'folder' ? 'is-folder' : 'is-file'} ${selectedPath === row.path ? 'is-active' : ''}`}
      style={{ paddingLeft: `${12 + row.depth * 16}px` }}
      onClick={() => (row.type === 'folder' ? onToggleFolder(row.path, !row.isExpanded) : onSelectFile(row.path))}
      onKeyDown={(event) => onRowKeyDown(event, index)}
    >
      {row.type === 'folder' ? <TreeChevron expanded={row.isExpanded} /> : <span class="sidebar-tree__chevron is-file" />}
      <TreeNodeIcon type={row.type} />
      <span class="file-tree__item-label">{row.name}</span>
    </button>
  )
}

function SidebarTreeRows({
  rows,
  selectedPath,
  loadingDocument,
  onSelectFile,
  onToggleFolder,
  containerRef,
}: SidebarTreeRowsProps) {
  const focusRow = useRowFocus(containerRef, rows)
  const handleRowKeyDown = useRowKeyDownHandler({ rows, focusRow, onToggleFolder, onSelectFile })

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
          onRowKeyDown={handleRowKeyDown}
        />
      ))}
    </>
  )
}

export function SidebarTree({ visibleFiles, selectedPath, loadingDocument, onSelectFile }: SidebarTreeProps) {
  const tree = useMemo(() => buildSidebarTree(visibleFiles), [visibleFiles])
  const [expandedFolders, setFolderExpanded] = useExpandedFolders(tree, selectedPath)
  const rows = useMemo(() => getVisibleSidebarRows(tree, new Set(expandedFolders)), [expandedFolders, tree])
  const containerRef = useRef<HTMLDivElement | null>(null)

  if (visibleFiles.length === 0) {
    return <p class="file-tree__empty">{PROJECT_EDITOR_STRINGS.noMarkdownFiles}</p>
  }

  return (
    <div class="file-tree sidebar-tree" ref={containerRef} role="tree" aria-label="Project files">
      <SidebarTreeRows
        rows={rows}
        selectedPath={selectedPath}
        loadingDocument={loadingDocument}
        onSelectFile={onSelectFile}
        onToggleFolder={setFolderExpanded}
        containerRef={containerRef}
      />
    </div>
  )
}
