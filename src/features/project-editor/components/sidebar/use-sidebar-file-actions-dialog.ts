import { useMemo, useState } from 'preact/hooks'
import { getBaseName, parseStringAsTags, serializeTags } from '../../../../shared/sidebar-utils'
import { useScopedSidebarActions } from './use-scoped-sidebar-actions'
import { useSidebarSectionRoot } from './sidebar-section-scope-context'
import { toProjectPath, toSectionRelativePath, type SidebarSectionRoot } from './sidebar-path-scoping'
import type { SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'

function buildFileLoaders(root: string) {
  const sectionRoot = root as SidebarSectionRoot
  const scope = (path: string) => toProjectPath(toSectionRelativePath(path), sectionRoot)
  return {
    loadFileTags: (path: string) => window.tramaApi.readDocument({ path: scope(path) }).then((response) => {
      if (!response.ok || !Array.isArray(response.data.meta.tags)) return []
      return response.data.meta.tags.filter((value): value is string => typeof value === 'string')
    }),
    loadFileDeleteInfo: (path: string) => window.tramaApi.readDocument({ path: scope(path) }).then((response) => ({
      linkedImagePaths: response.ok ? (response.data.linkedImagePaths ?? []) : [],
    })),
  }
}

interface CreateSidebarFileDialogActionsParams {
  renameFile: (input: { path: string; newName: string }) => void
  deleteFile: (path: string, options?: { deleteAssociatedImages?: boolean }) => void
  editFileTags: (path: string, tags: string[]) => void
  loadFileTags: (path: string) => Promise<string[]>
  loadFileDeleteInfo: (path: string) => Promise<{ linkedImagePaths: string[] }>
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

    void params.loadFileTags(path)
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
      params.renameFile({ path: targetPath, newName: renameValue })
      closeDialog()
      return
    }

    if (mode === 'edit-tags') {
      params.editFileTags(targetPath, parseStringAsTags(tagsValue))
      closeDialog()
      return
    }

    params.deleteFile(targetPath, params.getState().deleteAssociatedImages ? { deleteAssociatedImages: true } : undefined)
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

    void params.loadFileDeleteInfo(path)
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

export function useSidebarFileActionsDialog() {
  const actions = useScopedSidebarActions()
  const root = useSidebarSectionRoot()
  const { loadFileTags, loadFileDeleteInfo } = useMemo(() => buildFileLoaders(root), [root])
  const [mode, setMode] = useState<SidebarFileActionMode | null>(null)
  const [targetPath, setTargetPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [tagsValue, setTagsValue] = useState('')
  const [loadingTags, setLoadingTags] = useState(false)
  const [loadingDeleteInfo, setLoadingDeleteInfo] = useState(false)
  const [linkedImagePaths, setLinkedImagePaths] = useState<string[]>([])
  const [deleteAssociatedImages, setDeleteAssociatedImages] = useState(false)
  const { openRename, openDelete, openEditTags, closeDialog, confirm } = createSidebarFileDialogActions({
    renameFile: actions.renameFile,
    deleteFile: actions.deleteFile,
    editFileTags: actions.editFileTags,
    loadFileTags,
    loadFileDeleteInfo,
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
    openRename,
    openDelete,
    openEditTags,
    closeDialog,
    confirm,
  }
}
