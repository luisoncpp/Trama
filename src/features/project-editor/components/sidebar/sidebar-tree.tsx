import { useMemo, useRef } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { filterSidebarTree } from './sidebar-filter-logic'
import { buildSidebarTree, getVisibleSidebarRows } from './sidebar-tree-logic'
import { useSidebarTreeExpandedFolders } from './use-sidebar-tree-expanded-folders'
import { SidebarTreeRowButton } from './sidebar-tree-row-button'
import type { SidebarTreeRow } from './sidebar-tree-types'

export interface SidebarTreeProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => Promise<void>
  filterQuery: string
  onFileContextMenu?: (filePath: string, event: MouseEvent) => void
  onFolderContextMenu?: (folderPath: string, event: MouseEvent) => void
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
}: SidebarTreeRowsProps) {
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
  onFileContextMenu,
  onFolderContextMenu,
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

  if (visibleFiles.length === 0 && !hasFilterQuery) {
    return <p class="file-tree__empty">{PROJECT_EDITOR_STRINGS.noMarkdownFiles}</p>
  }

  if (rows.length === 0 && hasFilterQuery) {
    return <p class="file-tree__empty">No files match "{filterResult.query}".</p>
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
        onFileContextMenu={onFileContextMenu}
        onFolderContextMenu={onFolderContextMenu}
      />
    </div>
  )
}
