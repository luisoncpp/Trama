import { useRef } from 'preact/hooks'
import { SidebarExplorerBody } from './sidebar-explorer-body.tsx'
import type { SidebarExplorerCommonProps } from './sidebar-types'
import { useSidebarFileActionsDialog } from './use-sidebar-file-actions-dialog'
import { useSidebarCreateDialog, useSidebarFolderActionsDialog } from './sidebar-dialog-hooks'

interface SidebarHeaderProps {
  title: string
}

interface SidebarExplorerContentProps {
  title: string
  visibleFiles: SidebarExplorerCommonProps['visibleFiles']
  selectedPath: SidebarExplorerCommonProps['selectedPath']
  loadingDocument: SidebarExplorerCommonProps['loadingDocument']
  onSelectFile: SidebarExplorerCommonProps['onSelectFile']
  apiAvailable: SidebarExplorerCommonProps['apiAvailable']
  loadingProject: SidebarExplorerCommonProps['loadingProject']
  statusMessage: SidebarExplorerCommonProps['statusMessage']
  projectRootPath: string
  onPickFolder: SidebarExplorerCommonProps['onPickFolder']
  onCloseProject: SidebarExplorerCommonProps['onCloseProject']
  onRevealInFileManager: SidebarExplorerCommonProps['onRevealInFileManager']
  pickFolderDisabled: boolean
  filterQuery: string
  onFilterQueryChange: (value: string) => void
  onCreateArticle: SidebarExplorerCommonProps['onCreateArticle']
  onCreateMap: SidebarExplorerCommonProps['onCreateMap']
  onCreateCategory: SidebarExplorerCommonProps['onCreateCategory']
  onRenameFile: SidebarExplorerCommonProps['onRenameFile']
  onRenameFolder: SidebarExplorerCommonProps['onRenameFolder']
  onDeleteFolder: SidebarExplorerCommonProps['onDeleteFolder']
  onDeleteFile: SidebarExplorerCommonProps['onDeleteFile']
  onEditFileTags: SidebarExplorerCommonProps['onEditFileTags']
  onLoadFileTags: (path: string) => Promise<string[]>
  onLoadFileDeleteInfo?: (path: string) => Promise<{ linkedImagePaths: string[] }>
  corkboardOrder?: Record<string, string[]>
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
}

function useSidebarExplorerDialogs(props: SidebarExplorerContentProps) {
  const createDialog = useSidebarCreateDialog({
    selectedPath: props.selectedPath,
    onCreateArticle: props.onCreateArticle,
    onCreateMap: props.onCreateMap,
    onCreateCategory: props.onCreateCategory,
  })

  const fileDialog = useSidebarFileActionsDialog({
    onRenameFile: props.onRenameFile,
    onDeleteFile: props.onDeleteFile,
    onEditFileTags: props.onEditFileTags,
    onLoadFileTags: props.onLoadFileTags,
    onLoadFileDeleteInfo: props.onLoadFileDeleteInfo ?? (async () => ({ linkedImagePaths: [] })),
  })
  const folderDialog = useSidebarFolderActionsDialog({
    onRenameFolder: props.onRenameFolder,
    onDeleteFolder: props.onDeleteFolder,
  })

  return { createDialog, fileDialog, folderDialog }
}

function SidebarHeader({ title }: SidebarHeaderProps) {
  return (
    <div class="workspace-panel__header">
      <p class="workspace-panel__eyebrow">{title}</p>
    </div>
  )
}

export function SidebarExplorerContent(props: SidebarExplorerContentProps) {
  const { createDialog, fileDialog, folderDialog } = useSidebarExplorerDialogs(props)
  const filterInputElementRef = useRef<HTMLInputElement | null>(null)
  const setFilterInputRef = (el: HTMLInputElement | null) => { filterInputElementRef.current = el }

  const bodyProps = {
    title: props.title, visibleFiles: props.visibleFiles, selectedPath: props.selectedPath,
    loadingDocument: props.loadingDocument, onSelectFile: props.onSelectFile,
    loadingProject: props.loadingProject, apiAvailable: props.apiAvailable,
    statusMessage: props.statusMessage,
    projectRootPath: props.projectRootPath,
    onPickFolder: props.onPickFolder,
    onCloseProject: props.onCloseProject,
    onRevealInFileManager: props.onRevealInFileManager,
    pickFolderDisabled: props.pickFolderDisabled,
    filterQuery: props.filterQuery,
    onFilterQueryChange: props.onFilterQueryChange,
    createMode: createDialog.createMode, createInput: createDialog.createInput,
    openCreateDialog: createDialog.openCreateDialog, closeCreateDialog: createDialog.closeCreateDialog,
    submitCreateDialog: createDialog.submitCreateDialog,
    fileActionMode: fileDialog.mode, fileActionTargetPath: fileDialog.targetPath,
    renameValue: fileDialog.renameValue, openRenameDialog: fileDialog.openRename,
    openDeleteDialog: fileDialog.openDelete, openEditTagsDialog: fileDialog.openEditTags,
    openRenameFolderDialog: folderDialog.openRename, openDeleteFolderDialog: folderDialog.openDelete,
    closeFileActionDialog: fileDialog.closeDialog, confirmFileActionDialog: fileDialog.confirm,
    onRenameValueChange: fileDialog.setRenameValue, tagsValue: fileDialog.tagsValue,
    loadingTags: fileDialog.loadingTags, onTagsValueChange: fileDialog.setTagsValue,
    loadingDeleteInfo: fileDialog.loadingDeleteInfo, linkedImagePaths: fileDialog.linkedImagePaths,
    deleteAssociatedImages: fileDialog.deleteAssociatedImages, onDeleteAssociatedImagesChange: fileDialog.setDeleteAssociatedImages,
    folderActionMode: folderDialog.mode, folderRenameValue: folderDialog.renameValue,
    folderActionTargetPath: folderDialog.targetPath,
    onFolderRenameValueChange: folderDialog.setRenameValue,
    confirmFolderActionDialog: folderDialog.confirm, closeFolderActionDialog: folderDialog.closeDialog,
    onDirectoryChange: createDialog.setCreateDirectory, onNameChange: createDialog.setCreateName,
    onSourceImagePathChange: createDialog.setCreateSourceImagePath, onBrowseSourceImage: createDialog.browseCreateImage,
    filterInputRef: setFilterInputRef, corkboardOrder: props.corkboardOrder, onReorderFiles: props.onReorderFiles, onMoveFile: props.onMoveFile, onMoveFolder: props.onMoveFolder,
  }

  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar" aria-busy={props.loadingProject ? 'true' : 'false'}>
        <SidebarHeader title={props.title} />
        <SidebarExplorerBody {...bodyProps} />
      </aside>
    </div>
  )
}
