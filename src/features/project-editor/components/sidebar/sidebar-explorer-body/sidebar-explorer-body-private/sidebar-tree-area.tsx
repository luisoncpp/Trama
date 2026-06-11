import { SidebarTree } from '../../sidebar-tree.tsx'

export function EmptyStateHint({ showOnlyStateHint, loadingProject, apiAvailable }: {
  showOnlyStateHint: boolean
  loadingProject: boolean
  apiAvailable: boolean
}) {
  if (!showOnlyStateHint) return null
  if (!apiAvailable) {
    return <p class="file-tree__empty">Preload API unavailable. Reopen the app to restore sidebar actions.</p>
  }
  if (loadingProject) {
    return <p class="file-tree__empty">Loading project files...</p>
  }
  return null
}

export function SidebarTreeArea(props: {
  showOnlyStateHint: boolean
  loadingProject: boolean
  apiAvailable: boolean
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  filterQuery: string
  corkboardOrder?: Record<string, string[]>
  onFileContextMenu: (path: string, event: MouseEvent) => void
  onFolderContextMenu: (path: string, event: MouseEvent) => void
  expandedFolders: string[]
  onToggleFolder: (path: string, expanded: boolean) => void
}) {
  if (props.showOnlyStateHint) {
    return <EmptyStateHint loadingProject={props.loadingProject} apiAvailable={props.apiAvailable} showOnlyStateHint />
  }
  return (
    <SidebarTree
      visibleFiles={props.visibleFiles}
      selectedPath={props.selectedPath}
      loadingDocument={props.loadingDocument}
      filterQuery={props.filterQuery}
      corkboardOrder={props.corkboardOrder}
      onFileContextMenu={props.onFileContextMenu}
      onFolderContextMenu={props.onFolderContextMenu}
      expandedFolders={props.expandedFolders}
      onToggleFolder={props.onToggleFolder}
      isLoading={props.loadingProject}
    />
  )
}
