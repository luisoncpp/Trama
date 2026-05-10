import { useState } from 'preact/hooks'
import { getBaseName, parseStringAsTags, serializeTags } from '../../../../shared/sidebar-utils'
import type { SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'

interface UseSidebarFileActionsDialogParams {
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string, options?: { deleteAssociatedImages?: boolean }) => void
  onEditFileTags: (path: string, tags: string[]) => void
  onLoadFileTags: (path: string) => Promise<string[]>
  onLoadFileDeleteInfo: (path: string) => Promise<{ linkedImagePaths: string[] }>
}

interface CreateSidebarFileDialogActionsParams {
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string, options?: { deleteAssociatedImages?: boolean }) => void
  onEditFileTags: (path: string, tags: string[]) => void
  onLoadFileTags: (path: string) => Promise<string[]>
  onLoadFileDeleteInfo: (path: string) => Promise<{ linkedImagePaths: string[] }>
  getState: () => {
    mode: SidebarFileActionMode | null
    targetPath: string | null
    renameValue: string
    tagsValue: string
    deleteAssociatedImages: boolean
  }
  setMode: (value: SidebarFileActionMode | null) => void
  setTargetPath: (value: string | null) => void
  setRenameValue: (value: string) => void
  setTagsValue: (value: string) => void
  setLoadingTags: (value: boolean) => void
  setLoadingDeleteInfo: (value: boolean) => void
  setLinkedImagePaths: (value: string[]) => void
  setDeleteAssociatedImages: (value: boolean) => void
}

function resetDialogState(params: CreateSidebarFileDialogActionsParams) {
  params.setMode(null)
  params.setTargetPath(null)
  params.setRenameValue('')
  params.setTagsValue('')
  params.setLoadingTags(false)
  params.setLoadingDeleteInfo(false)
  params.setLinkedImagePaths([])
  params.setDeleteAssociatedImages(false)
}

function createOpenEditTagsAction(params: CreateSidebarFileDialogActionsParams) {
  return (path: string) => {
    if (!path) {
      return
    }

    params.setTargetPath(path)
    params.setMode('edit-tags')
    params.setTagsValue('')
    params.setLoadingTags(true)

    void params.onLoadFileTags(path)
      .then((tags) => {
        params.setTagsValue(serializeTags(tags))
      })
      .finally(() => {
        params.setLoadingTags(false)
      })
  }
}

function createConfirmAction(params: CreateSidebarFileDialogActionsParams, closeDialog: () => void) {
  return () => {
    const { targetPath, mode, renameValue, tagsValue } = params.getState()
    if (!targetPath || !mode) {
      return
    }

    if (mode === 'rename') {
      params.onRenameFile(targetPath, renameValue)
      closeDialog()
      return
    }

    if (mode === 'edit-tags') {
      params.onEditFileTags(targetPath, parseStringAsTags(tagsValue))
      closeDialog()
      return
    }

    params.onDeleteFile(targetPath, params.getState().deleteAssociatedImages ? { deleteAssociatedImages: true } : undefined)
    closeDialog()
  }
}

function createSidebarFileDialogActions(params: CreateSidebarFileDialogActionsParams) {
  const closeDialog = () => resetDialogState(params)

  const openRename = (path: string) => {
    if (!path) {
      return
    }

    params.setTargetPath(path)
    params.setMode('rename')
    params.setRenameValue(getBaseName(path))
  }

  const openDelete = (path: string) => {
    if (!path) {
      return
    }

    params.setTargetPath(path)
    params.setMode('delete')
    params.setLoadingDeleteInfo(true)
    params.setLinkedImagePaths([])
    params.setDeleteAssociatedImages(false)

    void params.onLoadFileDeleteInfo(path)
      .then((info) => {
        params.setLinkedImagePaths(info.linkedImagePaths)
      })
      .finally(() => {
        params.setLoadingDeleteInfo(false)
      })
  }
  const openEditTags = createOpenEditTagsAction(params)
  const confirm = createConfirmAction(params, closeDialog)

  return {
    openRename,
    openDelete,
    openEditTags,
    closeDialog,
    confirm,
  }
}

export function useSidebarFileActionsDialog({
  onRenameFile,
  onDeleteFile,
  onEditFileTags,
  onLoadFileTags,
  onLoadFileDeleteInfo,
}: UseSidebarFileActionsDialogParams) {
  const [mode, setMode] = useState<SidebarFileActionMode | null>(null)
  const [targetPath, setTargetPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [tagsValue, setTagsValue] = useState('')
  const [loadingTags, setLoadingTags] = useState(false)
  const [loadingDeleteInfo, setLoadingDeleteInfo] = useState(false)
  const [linkedImagePaths, setLinkedImagePaths] = useState<string[]>([])
  const [deleteAssociatedImages, setDeleteAssociatedImages] = useState(false)

  const actions = createSidebarFileDialogActions({
    onRenameFile,
    onDeleteFile,
    onEditFileTags,
    onLoadFileTags,
    onLoadFileDeleteInfo,
    getState: () => ({ mode, targetPath, renameValue, tagsValue, deleteAssociatedImages }),
    setMode,
    setTargetPath,
    setRenameValue,
    setTagsValue,
    setLoadingTags,
    setLoadingDeleteInfo,
    setLinkedImagePaths,
    setDeleteAssociatedImages,
  })

  return {
    mode,
    targetPath,
    renameValue,
    tagsValue,
    loadingTags,
    loadingDeleteInfo,
    linkedImagePaths,
    deleteAssociatedImages,
    setRenameValue,
    setTagsValue,
    setDeleteAssociatedImages,
    openRename: actions.openRename,
    openDelete: actions.openDelete,
    openEditTags: actions.openEditTags,
    closeDialog: actions.closeDialog,
    confirm: actions.confirm,
  }
}
