import { useState } from 'preact/hooks'
import { getBaseName, parseStringAsTags, serializeTags } from '../../../../shared/sidebar-utils'
import type { SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'

interface UseSidebarFileActionsDialogParams {
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
  onEditFileTags: (path: string, tags: string[]) => void
  onLoadFileTags: (path: string) => Promise<string[]>
}

interface CreateSidebarFileDialogActionsParams {
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
  onEditFileTags: (path: string, tags: string[]) => void
  onLoadFileTags: (path: string) => Promise<string[]>
  getState: () => {
    mode: SidebarFileActionMode | null
    targetPath: string | null
    renameValue: string
    tagsValue: string
  }
  setMode: (value: SidebarFileActionMode | null) => void
  setTargetPath: (value: string | null) => void
  setRenameValue: (value: string) => void
  setTagsValue: (value: string) => void
  setLoadingTags: (value: boolean) => void
}

function resetDialogState(params: CreateSidebarFileDialogActionsParams) {
  params.setMode(null)
  params.setTargetPath(null)
  params.setRenameValue('')
  params.setTagsValue('')
  params.setLoadingTags(false)
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

    params.onDeleteFile(targetPath)
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
}: UseSidebarFileActionsDialogParams) {
  const [mode, setMode] = useState<SidebarFileActionMode | null>(null)
  const [targetPath, setTargetPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [tagsValue, setTagsValue] = useState('')
  const [loadingTags, setLoadingTags] = useState(false)

  const actions = createSidebarFileDialogActions({
    onRenameFile,
    onDeleteFile,
    onEditFileTags,
    onLoadFileTags,
    getState: () => ({ mode, targetPath, renameValue, tagsValue }),
    setMode,
    setTargetPath,
    setRenameValue,
    setTagsValue,
    setLoadingTags,
  })

  return {
    mode,
    targetPath,
    renameValue,
    tagsValue,
    loadingTags,
    setRenameValue,
    setTagsValue,
    openRename: actions.openRename,
    openDelete: actions.openDelete,
    openEditTags: actions.openEditTags,
    closeDialog: actions.closeDialog,
    confirm: actions.confirm,
  }
}
