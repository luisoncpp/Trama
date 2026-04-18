import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'
import type { SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'
import type { SidebarFolderActionMode } from './sidebar-folder-actions-dialog.tsx'
import { ContextMenus } from './sidebar-dialogs-context-menus-ui'
import { FooterAndCreateDialog, FileActionsDialog, FolderActionsDialog } from './sidebar-dialogs-actions-ui'
import { useSidebarFileContextMenu, useSidebarFolderContextMenu } from './sidebar-dialogs-context-menus'

type FileContextMenuResult = ReturnType<typeof useSidebarFileContextMenu>
type FolderContextMenuResult = ReturnType<typeof useSidebarFolderContextMenu>

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
  fileContextMenu: FileContextMenuResult
  folderContextMenu: FolderContextMenuResult
  folderActionMode: SidebarFolderActionMode | null
  folderActionTargetPath: string | null
  folderRenameValue: string
  onFolderRenameValueChange: (value: string) => void
  confirmFolderActionDialog: () => void
  closeFolderActionDialog: () => void
}

function ActionDialogs(props: SidebarExplorerDialogsProps) {
  return (
    <>
      <FooterAndCreateDialog
        loadingProject={props.loadingProject}
        apiAvailable={props.apiAvailable}
        openCreateDialog={props.openCreateDialog}
        createMode={props.createMode}
        title={props.title}
        createInput={props.createInput}
        onDirectoryChange={props.onDirectoryChange}
        onNameChange={props.onNameChange}
        submitCreateDialog={props.submitCreateDialog}
        closeCreateDialog={props.closeCreateDialog}
      />
      <FileActionsDialog
        fileActionMode={props.fileActionMode}
        fileActionTargetPath={props.fileActionTargetPath}
        renameValue={props.renameValue}
        tagsValue={props.tagsValue}
        loadingTags={props.loadingTags}
        onRenameValueChange={props.onRenameValueChange}
        onTagsValueChange={props.onTagsValueChange}
        confirmFileActionDialog={props.confirmFileActionDialog}
        closeFileActionDialog={props.closeFileActionDialog}
      />
      <FolderActionsDialog
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

export function SidebarExplorerDialogs(props: SidebarExplorerDialogsProps) {
  return (
    <>
      <ContextMenus
        fileContextMenu={props.fileContextMenu}
        folderContextMenu={props.folderContextMenu}
      />
      <ActionDialogs {...props} />
    </>
  )
}
