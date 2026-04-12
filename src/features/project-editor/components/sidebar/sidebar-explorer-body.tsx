import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'
import { SidebarCreateDialog } from './sidebar-create-dialog.tsx'
import { SidebarFileContextMenu } from './sidebar-file-context-menu.tsx'
import { SidebarFileActionsDialog, type SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'
import { SidebarFooterActions } from './sidebar-footer-actions.tsx'
import { SidebarFilter } from './sidebar-filter.tsx'
import { SidebarTree } from './sidebar-tree.tsx'
import { useSidebarFileContextMenu } from './use-sidebar-file-context-menu'

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
  onSelectFile: (path: string) => void
  onFileContextMenu: (path: string, event: MouseEvent) => void
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
}

interface SidebarExplorerBodyProps {
  title: string
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
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
  closeFileActionDialog: () => void
  confirmFileActionDialog: () => void
  onRenameValueChange: (value: string) => void
  onTagsValueChange: (value: string) => void
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
  const showOnlyStateHint = !props.apiAvailable || props.loadingProject

  return (
    <>
      <p class="project-menu__path">{props.scopePathLabel || PROJECT_EDITOR_STRINGS.noFolderSelected}</p>
      <SidebarFilter
        value={props.filterQuery}
        disabled={showOnlyStateHint}
        inputRef={props.filterInputRef}
        onChange={props.onFilterQueryChange}
      />
      <SidebarTreeArea
        showOnlyStateHint={showOnlyStateHint}
        loadingProject={props.loadingProject}
        apiAvailable={props.apiAvailable}
        visibleFiles={props.visibleFiles}
        selectedPath={props.selectedPath}
        loadingDocument={props.loadingDocument}
        filterQuery={props.filterQuery}
        onSelectFile={props.onSelectFile}
        onFileContextMenu={fileContextMenu.handleFileContextMenu}
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
      />
    </>
  )
}
