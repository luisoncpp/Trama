import { useState } from 'preact/hooks'
import type { SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'

interface UseSidebarFileActionsDialogParams {
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
  onEditFileTags: (path: string, tags: string[]) => void
  onLoadFileTags: (path: string) => Promise<string[]>
}

function getFileName(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.at(-1) ?? path
}

function parseTags(rawValue: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const entry of rawValue.split(/[\n,]/g)) {
    const next = entry.trim()
    if (!next) {
      continue
    }

    const lower = next.toLocaleLowerCase()
    if (seen.has(lower)) {
      continue
    }

    seen.add(lower)
    tags.push(next)
  }

  return tags
}

function serializeTags(tags: unknown): string {
  if (!Array.isArray(tags)) {
    return ''
  }

  return tags
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(', ')
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

  const openRename = (path: string) => {
    if (!path) {
      return
    }

    setTargetPath(path)
    setMode('rename')
    setRenameValue(getFileName(path))
  }

  const openDelete = (path: string) => {
    if (!path) {
      return
    }

    setTargetPath(path)
    setMode('delete')
  }

  const openEditTags = (path: string) => {
    if (!path) {
      return
    }

    setTargetPath(path)
    setMode('edit-tags')
    setTagsValue('')
    setLoadingTags(true)

    void onLoadFileTags(path).then((tags) => {
      setTagsValue(serializeTags(tags))
    }).finally(() => {
      setLoadingTags(false)
    })
  }

  const closeDialog = () => {
    setMode(null)
    setTargetPath(null)
    setRenameValue('')
    setTagsValue('')
    setLoadingTags(false)
  }

  const confirm = () => {
    if (!targetPath || !mode) {
      return
    }

    if (mode === 'rename') {
      onRenameFile(targetPath, renameValue)
      closeDialog()
      return
    }

    if (mode === 'edit-tags') {
      onEditFileTags(targetPath, parseTags(tagsValue))
      closeDialog()
      return
    }

    onDeleteFile(targetPath)
    closeDialog()
  }

  return {
    mode,
    targetPath,
    renameValue,
    tagsValue,
    loadingTags,
    setRenameValue,
    setTagsValue,
    openRename,
    openDelete,
    openEditTags,
    closeDialog,
    confirm,
  }
}
