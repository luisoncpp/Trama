// @Architecture(descriptionShort="Explorer body (path, filter, tree, menus/dialogs)")
import { useMemo } from 'preact/hooks'
import { SidebarScopePathBreadcrumb } from '../../sidebar-scope-path-breadcrumb.tsx'
import { useSidebarState } from '../../sidebar-state-context.tsx'
import { useScopedSidebarState } from '../../use-scoped-sidebar-state.ts'
import type { SidebarCreateInput } from '../../../../project-editor-types'
import type { SidebarCreateMode } from '../../sidebar-create-dialog.tsx'
import type { SidebarFileActionMode } from '../../sidebar-file-actions-dialog.tsx'
import type { SidebarFolderActionMode } from '../../sidebar-folder-actions-dialog.tsx'
import { SidebarExplorerDialogs } from '../../sidebar-explorer-dialogs.tsx'
import { useSidebarDialogs } from '../../sidebar-dialogs-context-menus'
import { SidebarFilter } from '../../sidebar-filter.tsx'
import { buildSidebarTree } from '../../sidebar-tree-logic'
import { filterSidebarTree } from '../../sidebar-filter-logic'
import { useSidebarTreeExpandedFolders } from '../../use-sidebar-tree-expanded-folders'
import { SidebarTreeArea } from './sidebar-tree-area.tsx'

export interface SidebarExplorerBodyProps {
  title: string
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
  onSourceImagePathChange: (value: string) => void
  onBrowseSourceImage: () => Promise<void>
  filterInputRef: (element: HTMLInputElement | null) => void
  showTemplatePicker?: boolean
  templateSearchQuery?: string
  templateSelectedPath?: string | null
  filteredTemplates?: { path: string; name: string; relativePath: string }[]
  onTemplateSearchChange?: (value: string) => void
  onTemplateSelect?: (path: string | null) => void
  hideMapOption?: boolean
  loadingDeleteInfo?: boolean
  linkedImagePaths?: string[]
  deleteAssociatedImages?: boolean
  onDeleteAssociatedImagesChange?: (value: boolean) => void
}

function buildDialogsProps(
  props: SidebarExplorerBodyProps,
  flags: { loadingProject: boolean; apiAvailable: boolean },
  fileContextMenu: ReturnType<typeof useSidebarDialogs>['fileContextMenu'],
  folderContextMenu: ReturnType<typeof useSidebarDialogs>['folderContextMenu'],
) {
  return {
    loadingProject: flags.loadingProject,
    apiAvailable: flags.apiAvailable,
    openCreateDialog: props.openCreateDialog,
    createMode: props.createMode,
    createInput: props.createInput,
    onDirectoryChange: props.onDirectoryChange,
    onNameChange: props.onNameChange,
    onSourceImagePathChange: props.onSourceImagePathChange,
    onBrowseSourceImage: props.onBrowseSourceImage,
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
    showTemplatePicker: props.showTemplatePicker,
    templateSearchQuery: props.templateSearchQuery,
    templateSelectedPath: props.templateSelectedPath,
    filteredTemplates: props.filteredTemplates,
    onTemplateSearchChange: props.onTemplateSearchChange,
    onTemplateSelect: props.onTemplateSelect,
    hideMapOption: props.hideMapOption,
    loadingDeleteInfo: props.loadingDeleteInfo,
    linkedImagePaths: props.linkedImagePaths,
    deleteAssociatedImages: props.deleteAssociatedImages,
    onDeleteAssociatedImagesChange: props.onDeleteAssociatedImagesChange,
  }
}

export function SidebarExplorerBody(props: SidebarExplorerBodyProps) {
  const { apiAvailable, loadingProject, statusMessage } = useSidebarState()
  const scoped = useScopedSidebarState()
  const { fileContextMenu, folderContextMenu } = useSidebarDialogs({
    openEditTagsDialog: props.openEditTagsDialog,
    openRenameDialog: props.openRenameDialog,
    openDeleteDialog: props.openDeleteDialog,
    openRenameFolderDialog: props.openRenameFolderDialog,
    openDeleteFolderDialog: props.openDeleteFolderDialog,
  })

  const tree = useMemo(/* getExplorerTree */ () => buildSidebarTree(scoped.visibleFiles), [scoped.visibleFiles] /*Inputs for getExplorerTree*/)
  const filterResult = useMemo(/* getExplorerFilterResult */ () => filterSidebarTree(tree, props.filterQuery), [tree, props.filterQuery] /*Inputs for getExplorerFilterResult*/)
  const [setFolderExpanded, expandedFolders] = useSidebarTreeExpandedFolders(
    tree,
    scoped.selectedPath,
    props.filterQuery,
    filterResult.autoExpandFolderPaths,
  )

  return (
    <>
      <SidebarScopePathBreadcrumb />
      {statusMessage && <p class="project-menu__status">{statusMessage}</p>}
      <SidebarFilter
        value={props.filterQuery} onChange={props.onFilterQueryChange}
        disabled={!apiAvailable || loadingProject} inputRef={props.filterInputRef}
      />
      <SidebarTreeArea
        filterQuery={props.filterQuery}
        expandedFolders={expandedFolders}
        onFileContextMenu={fileContextMenu.handleFileContextMenu}
        onFolderContextMenu={folderContextMenu.handleFolderContextMenu}
        onToggleFolder={setFolderExpanded}
      />
      <SidebarExplorerDialogs {...buildDialogsProps(props, { loadingProject, apiAvailable }, fileContextMenu, folderContextMenu)} />
    </>
  )
}
