import type { SidebarCreateInput } from '../../project-editor-types'
import type { FilteredTemplate } from '../../templates/templates-catalog-private/filter-template-paths'
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
  onSourceImagePathChange: (value: string) => void
  onBrowseSourceImage: () => Promise<void>
  submitCreateDialog: () => void
  closeCreateDialog: () => void
  showTemplatePicker?: boolean
  templateSearchQuery?: string
  templateSelectedPath?: string | null
  filteredTemplates?: FilteredTemplate[]
  onTemplateSearchChange?: (value: string) => void
  onTemplateSelect?: (path: string | null) => void
  hideMapOption?: boolean
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
  onSourceImagePathChange,
  onBrowseSourceImage,
  submitCreateDialog,
  closeCreateDialog,
  showTemplatePicker = false,
  templateSearchQuery = '',
  templateSelectedPath = null,
  filteredTemplates = [],
  onTemplateSearchChange,
  onTemplateSelect,
  hideMapOption = false,
}: FooterAndCreateDialogProps) {
  return (
    <>
      <SidebarFooterActions
        disabled={loadingProject || !apiAvailable}
        onCreateArticle={() => openCreateDialog('article')}
        onCreateMap={hideMapOption ? undefined : (() => openCreateDialog('map'))}
        onCreateRelationships={hideMapOption ? undefined : (() => openCreateDialog('relationships'))}
        onCreateCategory={() => openCreateDialog('category')}
      />
      <SidebarCreateDialog
        mode={createMode}
        sectionTitle={title}
        value={createInput}
        onDirectoryChange={onDirectoryChange}
        onNameChange={onNameChange}
        onSourceImagePathChange={onSourceImagePathChange}
        onBrowseSourceImage={onBrowseSourceImage}
        onSubmit={submitCreateDialog}
        onCancel={closeCreateDialog}
        showTemplatePicker={showTemplatePicker}
        templateSearchQuery={templateSearchQuery}
        templateSelectedPath={templateSelectedPath}
        filteredTemplates={filteredTemplates}
        onTemplateSearchChange={onTemplateSearchChange}
        onTemplateSelect={onTemplateSelect}
      />
    </>
  )
}

export interface FileActionsDialogProps {
  fileActionMode: SidebarFileActionMode | null
  fileActionTargetPath: string | null
  renameValue: string
  tagsValue: string
  loadingTags: boolean
  loadingDeleteInfo?: boolean
  linkedImagePaths?: string[]
  deleteAssociatedImages?: boolean
  onRenameValueChange: (value: string) => void
  onTagsValueChange: (value: string) => void
  onDeleteAssociatedImagesChange?: (value: boolean) => void
  confirmFileActionDialog: () => void
  closeFileActionDialog: () => void
}

export function FileActionsDialog({
  fileActionMode,
  fileActionTargetPath,
  renameValue,
  tagsValue,
  loadingTags,
  loadingDeleteInfo,
  linkedImagePaths,
  deleteAssociatedImages,
  onRenameValueChange,
  onTagsValueChange,
  onDeleteAssociatedImagesChange,
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
      loadingDeleteInfo={loadingDeleteInfo}
      linkedImagePaths={linkedImagePaths}
      deleteAssociatedImages={deleteAssociatedImages}
      onRenameValueChange={onRenameValueChange}
      onTagsValueChange={onTagsValueChange}
      onDeleteAssociatedImagesChange={onDeleteAssociatedImagesChange}
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
