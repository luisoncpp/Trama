import { useMemo } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'
import type { SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'
import type { SidebarFolderActionMode } from './sidebar-folder-actions-dialog.tsx'
import { SidebarExplorerDialogs } from './sidebar-explorer-dialogs.tsx'
import { useSidebarDialogs } from './sidebar-dialogs-context-menus'
import { SidebarFilter } from './sidebar-filter.tsx'
import { SidebarTree } from './sidebar-tree.tsx'
import { buildSidebarTree } from './sidebar-tree-logic'
import { filterSidebarTree } from './sidebar-filter-logic'
import { useSidebarTreeExpandedFolders } from './use-sidebar-tree-expanded-folders'

function EmptyStateHint({ showOnlyStateHint, loadingProject, apiAvailable }: {
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

function SidebarTreeArea(props: {
  showOnlyStateHint: boolean
  loadingProject: boolean
  apiAvailable: boolean
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  filterQuery: string
  corkboardOrder?: Record<string, string[]>
  onSelectFile: (path: string) => Promise<void>
  onFileContextMenu: (path: string, event: MouseEvent) => void
  onFolderContextMenu: (path: string, event: MouseEvent) => void
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
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
      onSelectFile={props.onSelectFile}
      filterQuery={props.filterQuery}
      corkboardOrder={props.corkboardOrder}
      onFileContextMenu={props.onFileContextMenu}
      onFolderContextMenu={props.onFolderContextMenu}
      onReorderFiles={props.onReorderFiles}
      onMoveFile={props.onMoveFile}
      onMoveFolder={props.onMoveFolder}
      expandedFolders={props.expandedFolders}
      onToggleFolder={props.onToggleFolder}
      isLoading={props.loadingProject}
    />
  )
}

interface SidebarExplorerBodyProps {
  title: string
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => Promise<void>
  loadingProject: boolean
  apiAvailable: boolean
  statusMessage: string
  scopePathLabel: string
  filterQuery: string
  onFilterQueryChange: (value: string) => void
  createMode: SidebarCreateMode | null
  createInput: SidebarCreateInput
  openCreateDialog: (mode: SidebarCreateMode) => void
  closeCreateDialog: () => void
  submitCreateDialog: () => void
  fileActionMode: SidebarFileActionMode | null
  fileActionTargetPath: string | null
  renameValue: string
  tagsValue: string
  loadingTags: boolean
  openRenameDialog: (path: string) => void
  openDeleteDialog: (path: string) => void
  openEditTagsDialog: (path: string) => void
  openRenameFolderDialog: (path: string) => void
  openDeleteFolderDialog: (path: string) => void
  closeFileActionDialog: () => void
  confirmFileActionDialog: () => void
  onRenameValueChange: (value: string) => void
  onTagsValueChange: (value: string) => void
  folderActionMode: SidebarFolderActionMode | null
  folderRenameValue: string
  folderActionTargetPath: string | null
  onFolderRenameValueChange: (value: string) => void
  confirmFolderActionDialog: () => void
  closeFolderActionDialog: () => void
  onDirectoryChange: (value: string) => void
  onNameChange: (value: string) => void
  filterInputRef: (element: HTMLInputElement | null) => void
  corkboardOrder?: Record<string, string[]>
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
}

function buildDialogsProps(props: SidebarExplorerBodyProps, fileContextMenu: ReturnType<typeof useSidebarDialogs>['fileContextMenu'], folderContextMenu: ReturnType<typeof useSidebarDialogs>['folderContextMenu']) {
  return {
    loadingProject: props.loadingProject,
    apiAvailable: props.apiAvailable,
    openCreateDialog: props.openCreateDialog,
    createMode: props.createMode,
    createInput: props.createInput,
    onDirectoryChange: props.onDirectoryChange,
    onNameChange: props.onNameChange,
    submitCreateDialog: props.submitCreateDialog,
    closeCreateDialog: props.closeCreateDialog,
    title: props.title,
    fileActionMode: props.fileActionMode,
    fileActionTargetPath: props.fileActionTargetPath,
    renameValue: props.renameValue,
    tagsValue: props.tagsValue,
    loadingTags: props.loadingTags,
    onRenameValueChange: props.onRenameValueChange,
    onTagsValueChange: props.onTagsValueChange,
    confirmFileActionDialog: props.confirmFileActionDialog,
    closeFileActionDialog: props.closeFileActionDialog,
    fileContextMenu,
    folderContextMenu,
    folderActionMode: props.folderActionMode,
    folderActionTargetPath: props.folderActionTargetPath,
    folderRenameValue: props.folderRenameValue,
    onFolderRenameValueChange: props.onFolderRenameValueChange,
    confirmFolderActionDialog: props.confirmFolderActionDialog,
    closeFolderActionDialog: props.closeFolderActionDialog,
  }
}

export function SidebarExplorerBody(props: SidebarExplorerBodyProps) {
  const { fileContextMenu, folderContextMenu } = useSidebarDialogs({
    onSelectFile: props.onSelectFile,
    openEditTagsDialog: props.openEditTagsDialog,
    openRenameDialog: props.openRenameDialog,
    openDeleteDialog: props.openDeleteDialog,
    openRenameFolderDialog: props.openRenameFolderDialog,
    openDeleteFolderDialog: props.openDeleteFolderDialog,
  })

  const tree = useMemo(() => buildSidebarTree(props.visibleFiles), [props.visibleFiles])
  const filterResult = useMemo(() => filterSidebarTree(tree, props.filterQuery), [tree, props.filterQuery])
  const [setFolderExpanded, expandedFolders] = useSidebarTreeExpandedFolders(
    tree,
    props.selectedPath,
    props.filterQuery,
    filterResult.autoExpandFolderPaths,
  )

  return (
    <>
      <p class="project-menu__path">{props.scopePathLabel || PROJECT_EDITOR_STRINGS.noFolderSelected}</p>
      {props.statusMessage && <p class="project-menu__status">{props.statusMessage}</p>}
      <SidebarFilter
        value={props.filterQuery}
        disabled={!props.apiAvailable || props.loadingProject}
        inputRef={props.filterInputRef}
        onChange={props.onFilterQueryChange}
      />
      <SidebarTreeArea
        showOnlyStateHint={!props.apiAvailable}
        loadingProject={props.loadingProject}
        apiAvailable={props.apiAvailable}
        visibleFiles={props.visibleFiles}
        selectedPath={props.selectedPath}
        loadingDocument={props.loadingDocument}
        filterQuery={props.filterQuery}
        corkboardOrder={props.corkboardOrder}
        onSelectFile={props.onSelectFile}
        onFileContextMenu={fileContextMenu.handleFileContextMenu}
        onFolderContextMenu={folderContextMenu.handleFolderContextMenu}
        onReorderFiles={props.onReorderFiles}
        onMoveFile={props.onMoveFile}
        onMoveFolder={props.onMoveFolder}
        expandedFolders={expandedFolders}
        onToggleFolder={setFolderExpanded}
      />
      <SidebarExplorerDialogs {...buildDialogsProps(props, fileContextMenu, folderContextMenu)} />
    </>
  )
}
