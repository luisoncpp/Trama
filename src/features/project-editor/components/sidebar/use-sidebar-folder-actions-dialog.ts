import { useState } from 'preact/hooks'
import type { SidebarFolderActionMode } from './sidebar-folder-actions-dialog.tsx'

interface UseSidebarFolderActionsDialogParams {
  onRenameFolder: (path: string, newName: string) => void
  onDeleteFolder: (path: string) => void
}

function getFolderName(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.at(-1) ?? path
}

export function useSidebarFolderActionsDialog({ onRenameFolder, onDeleteFolder }: UseSidebarFolderActionsDialogParams) {
  const [mode, setMode] = useState<SidebarFolderActionMode | null>(null)
  const [targetPath, setTargetPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const closeDialog = () => {
    setMode(null)
    setTargetPath(null)
    setRenameValue('')
  }

  const openRename = (path: string) => {
    if (!path) {
      return
    }

    setMode('rename')
    setTargetPath(path)
    setRenameValue(getFolderName(path))
  }

  const openDelete = (path: string) => {
    if (!path) {
      return
    }

    setMode('delete')
    setTargetPath(path)
    setRenameValue('')
  }

  const confirm = () => {
    if (!targetPath || !mode) {
      return
    }

    if (mode === 'rename') {
      onRenameFolder(targetPath, renameValue)
    } else {
      onDeleteFolder(targetPath)
    }

    closeDialog()
  }

  return {
    mode,
    targetPath,
    renameValue,
    setRenameValue,
    openRename,
    openDelete,
    closeDialog,
    confirm,
  }
}
