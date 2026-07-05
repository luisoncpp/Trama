// @Architecture(descriptionShort="Helper rendering component for tree structure area and empty state placeholder hints")
import { SidebarTree } from '../../sidebar-tree.tsx'
import { useSidebarState } from '../../sidebar-state-context.tsx'

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
  filterQuery: string
  onFileContextMenu: (path: string, event: MouseEvent) => void
  onFolderContextMenu: (path: string, event: MouseEvent) => void
  expandedFolders: string[]
  onToggleFolder: (path: string, expanded: boolean) => void
}) {
  const { apiAvailable, loadingProject } = useSidebarState()
  const showOnlyStateHint = !apiAvailable
  if (showOnlyStateHint) {
    return <EmptyStateHint loadingProject={loadingProject} apiAvailable={apiAvailable} showOnlyStateHint />
  }
  return (
    <SidebarTree
      filterQuery={props.filterQuery}
      onFileContextMenu={props.onFileContextMenu}
      onFolderContextMenu={props.onFolderContextMenu}
      expandedFolders={props.expandedFolders}
      onToggleFolder={props.onToggleFolder}
    />
  )
}
