import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'
import { SidebarCreateDialog } from './sidebar-create-dialog.tsx'
import { SidebarFileActionsDialog, type SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'
import { SidebarFolderActionsDialog, type SidebarFolderActionMode } from './sidebar-folder-actions-dialog.tsx'
import { SidebarFooterActions } from './sidebar-footer-actions.tsx'

interface FooterAndCreateDialogProps {
  loadingProject: boolean
  apiAvailable: boolean
  openCreateDialog: (mode: SidebarCreateMode) => void
  createMode: SidebarCreateMode | null
  title: string
  createInput: SidebarCreateInput
  onDirectoryChange: (value: string) => void
  onNameChange: (value: string) => void
  submitCreateDialog: () => void
  closeCreateDialog: () => void
}

export function FooterAndCreateDialog({
  loadingProject,
  apiAvailable,
  openCreateDialog,
  createMode,
  title,
  createInput,
  onDirectoryChange,
  onNameChange,
  submitCreateDialog,
  closeCreateDialog,
}: FooterAndCreateDialogProps) {
  return (
    <>
      <SidebarFooterActions
        disabled={loadingProject || !apiAvailable}
        onCreateArticle={() => openCreateDialog('article')}
        onCreateCategory={() => openCreateDialog('category')}
      />
      <SidebarCreateDialog
        mode={createMode}
        sectionTitle={title}
        value={createInput}
        onDirectoryChange={onDirectoryChange}
        onNameChange={onNameChange}
        onSubmit={submitCreateDialog}
        onCancel={closeCreateDialog}
      />
    </>
  )
}

interface FileActionsDialogProps {
  fileActionMode: SidebarFileActionMode | null
  fileActionTargetPath: string | null
  renameValue: string
  tagsValue: string
  loadingTags: boolean
  onRenameValueChange: (value: string) => void
  onTagsValueChange: (value: string) => void
  confirmFileActionDialog: () => void
  closeFileActionDialog: () => void
}

export function FileActionsDialog({
  fileActionMode,
  fileActionTargetPath,
  renameValue,
  tagsValue,
  loadingTags,
  onRenameValueChange,
  onTagsValueChange,
  confirmFileActionDialog,
  closeFileActionDialog,
}: FileActionsDialogProps) {
  return (
    <SidebarFileActionsDialog
      mode={fileActionMode}
      targetPath={fileActionTargetPath}
      renameValue={renameValue}
      tagsValue={tagsValue}
      loadingTags={loadingTags}
      onRenameValueChange={onRenameValueChange}
      onTagsValueChange={onTagsValueChange}
      onConfirm={confirmFileActionDialog}
      onCancel={closeFileActionDialog}
    />
  )
}

interface FolderActionsDialogProps {
  folderActionMode: SidebarFolderActionMode | null
  folderActionTargetPath: string | null
  folderRenameValue: string
  onFolderRenameValueChange: (value: string) => void
  confirmFolderActionDialog: () => void
  closeFolderActionDialog: () => void
}

export function FolderActionsDialog({
  folderActionMode,
  folderActionTargetPath,
  folderRenameValue,
  onFolderRenameValueChange,
  confirmFolderActionDialog,
  closeFolderActionDialog,
}: FolderActionsDialogProps) {
  return (
    <SidebarFolderActionsDialog
      mode={folderActionMode}
      targetPath={folderActionTargetPath}
      renameValue={folderRenameValue}
      onRenameValueChange={onFolderRenameValueChange}
      onConfirm={confirmFolderActionDialog}
      onCancel={closeFolderActionDialog}
    />
  )
}
