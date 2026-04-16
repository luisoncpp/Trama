import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'
import { SidebarCreateDialog } from './sidebar-create-dialog.tsx'
import { SidebarFileContextMenu } from './sidebar-file-context-menu.tsx'
import { SidebarFileActionsDialog, type SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'
import { SidebarFolderActionsDialog, type SidebarFolderActionMode } from './sidebar-folder-actions-dialog.tsx'
import { SidebarFolderContextMenu } from './sidebar-folder-context-menu.tsx'
import { SidebarFooterActions } from './sidebar-footer-actions.tsx'
import { SidebarFilter } from './sidebar-filter.tsx'
import { SidebarTree } from './sidebar-tree.tsx'
import { useSidebarFileContextMenu } from './use-sidebar-file-context-menu'
import { useSidebarFolderContextMenu } from './use-sidebar-folder-context-menu'

interface SidebarStateHintProps {
  loadingProject: boolean
  apiAvailable: boolean
}

interface SidebarTreeAreaProps {
  showOnlyStateHint: boolean
  loadingProject: boolean
  apiAvailable: boolean
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  filterQuery: string
  onSelectFile: (path: string) => Promise<void>
  onFileContextMenu: (path: string, event: MouseEvent) => void
  onFolderContextMenu: (path: string, event: MouseEvent) => void
}

interface SidebarExplorerDialogsProps {
  loadingProject: boolean
  apiAvailable: boolean
  openCreateDialog: (mode: SidebarCreateMode) => void
  createMode: SidebarCreateMode | null
  createInput: SidebarCreateInput
  onDirectoryChange: (value: string) => void
  onNameChange: (value: string) => void
  submitCreateDialog: () => void
  closeCreateDialog: () => void
  title: string
  fileActionMode: SidebarFileActionMode | null
  fileActionTargetPath: string | null
  renameValue: string
  tagsValue: string
  loadingTags: boolean
  onRenameValueChange: (value: string) => void
  onTagsValueChange: (value: string) => void
  confirmFileActionDialog: () => void
  closeFileActionDialog: () => void
  fileContextMenu: ReturnType<typeof useSidebarFileContextMenu>
  folderContextMenu: ReturnType<typeof useSidebarFolderContextMenu>
  folderActionMode: SidebarFolderActionMode | null
  folderActionTargetPath: string | null
  folderRenameValue: string
  onFolderRenameValueChange: (value: string) => void
  confirmFolderActionDialog: () => void
  closeFolderActionDialog: () => void
}

interface SidebarExplorerBodyProps {
  title: string
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => Promise<void>
  loadingProject: boolean
  apiAvailable: boolean
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
}

function SidebarStateHint({ loadingProject, apiAvailable }: SidebarStateHintProps) {
  if (!apiAvailable) {
    return <p class="file-tree__empty">Preload API unavailable. Reopen the app to restore sidebar actions.</p>
  }

  if (loadingProject) {
    return <p class="file-tree__empty">Loading project files...</p>
  }

  return null
}

function SidebarTreeArea(props: SidebarTreeAreaProps) {
  if (props.showOnlyStateHint) {
    return <SidebarStateHint loadingProject={props.loadingProject} apiAvailable={props.apiAvailable} />
  }

  return (
    <SidebarTree
      visibleFiles={props.visibleFiles}
      selectedPath={props.selectedPath}
      loadingDocument={props.loadingDocument}
      onSelectFile={props.onSelectFile}
      filterQuery={props.filterQuery}
      onFileContextMenu={props.onFileContextMenu}
      onFolderContextMenu={props.onFolderContextMenu}
    />
  )
}

function SidebarExplorerDialogs(props: SidebarExplorerDialogsProps) {
  return (
    <>
      <SidebarFooterActions
        disabled={props.loadingProject || !props.apiAvailable}
        onCreateArticle={() => props.openCreateDialog('article')}
        onCreateCategory={() => props.openCreateDialog('category')}
      />
      <SidebarFileContextMenu
        isOpen={Boolean(props.fileContextMenu.contextMenuState)}
        position={
          props.fileContextMenu.contextMenuState
            ? { x: props.fileContextMenu.contextMenuState.x, y: props.fileContextMenu.contextMenuState.y }
            : null
        }
        onEditTags={props.fileContextMenu.handleEditTagsFromContextMenu}
        onRename={props.fileContextMenu.handleRenameFromContextMenu}
        onDelete={props.fileContextMenu.handleDeleteFromContextMenu}
        onClose={props.fileContextMenu.closeContextMenu}
      />
      <SidebarCreateDialog
        mode={props.createMode}
        sectionTitle={props.title}
        value={props.createInput}
        onDirectoryChange={props.onDirectoryChange}
        onNameChange={props.onNameChange}
        onSubmit={props.submitCreateDialog}
        onCancel={props.closeCreateDialog}
      />
      <SidebarFolderContextMenu
        isOpen={Boolean(props.folderContextMenu.contextMenuState)}
        position={
          props.folderContextMenu.contextMenuState
            ? { x: props.folderContextMenu.contextMenuState.x, y: props.folderContextMenu.contextMenuState.y }
            : null
        }
        onRename={props.folderContextMenu.handleRenameFromContextMenu}
        onDelete={props.folderContextMenu.handleDeleteFromContextMenu}
        onClose={props.folderContextMenu.closeContextMenu}
      />
      <SidebarFileActionsDialog
        mode={props.fileActionMode}
        targetPath={props.fileActionTargetPath}
        renameValue={props.renameValue}
        tagsValue={props.tagsValue}
        loadingTags={props.loadingTags}
        onRenameValueChange={props.onRenameValueChange}
        onTagsValueChange={props.onTagsValueChange}
        onConfirm={props.confirmFileActionDialog}
        onCancel={props.closeFileActionDialog}
      />
      <SidebarFolderActionsDialog
        mode={props.folderActionMode}
        targetPath={props.folderActionTargetPath}
        renameValue={props.folderRenameValue}
        onRenameValueChange={props.onFolderRenameValueChange}
        onConfirm={props.confirmFolderActionDialog}
        onCancel={props.closeFolderActionDialog}
      />
    </>
  )
}

export function SidebarExplorerBody(props: SidebarExplorerBodyProps) {
  const fileContextMenu = useSidebarFileContextMenu({
    onSelectFile: props.onSelectFile,
    onOpenEditTags: props.openEditTagsDialog,
    onOpenRename: props.openRenameDialog,
    onOpenDelete: props.openDeleteDialog,
  })
  const folderContextMenu = useSidebarFolderContextMenu({
    onOpenRename: props.openRenameFolderDialog,
    onOpenDelete: props.openDeleteFolderDialog,
  })
  return (
    <>
      <p class="project-menu__path">{props.scopePathLabel || PROJECT_EDITOR_STRINGS.noFolderSelected}</p>
      <SidebarFilter value={props.filterQuery} disabled={!props.apiAvailable || props.loadingProject} inputRef={props.filterInputRef} onChange={props.onFilterQueryChange} />
      <SidebarTreeArea
        showOnlyStateHint={!props.apiAvailable || props.loadingProject}
        loadingProject={props.loadingProject}
        apiAvailable={props.apiAvailable}
        visibleFiles={props.visibleFiles}
        selectedPath={props.selectedPath}
        loadingDocument={props.loadingDocument}
        filterQuery={props.filterQuery}
        onSelectFile={props.onSelectFile}
        onFileContextMenu={fileContextMenu.handleFileContextMenu}
        onFolderContextMenu={folderContextMenu.handleFolderContextMenu}
      />
      <SidebarExplorerDialogs
        loadingProject={props.loadingProject}
        apiAvailable={props.apiAvailable}
        openCreateDialog={props.openCreateDialog}
        createMode={props.createMode}
        createInput={props.createInput}
        onDirectoryChange={props.onDirectoryChange}
        onNameChange={props.onNameChange}
        submitCreateDialog={props.submitCreateDialog}
        closeCreateDialog={props.closeCreateDialog}
        title={props.title}
        fileActionMode={props.fileActionMode}
        fileActionTargetPath={props.fileActionTargetPath}
        renameValue={props.renameValue}
        tagsValue={props.tagsValue}
        loadingTags={props.loadingTags}
        onRenameValueChange={props.onRenameValueChange}
        onTagsValueChange={props.onTagsValueChange}
        confirmFileActionDialog={props.confirmFileActionDialog}
        closeFileActionDialog={props.closeFileActionDialog}
        fileContextMenu={fileContextMenu}
        folderContextMenu={folderContextMenu}
        folderActionMode={props.folderActionMode}
        folderActionTargetPath={props.folderActionTargetPath}
        folderRenameValue={props.folderRenameValue}
        onFolderRenameValueChange={props.onFolderRenameValueChange}
        confirmFolderActionDialog={props.confirmFolderActionDialog}
        closeFolderActionDialog={props.closeFolderActionDialog}
      />
    </>
  )
}
