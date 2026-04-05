import { useState } from 'preact/hooks'
import type { SidebarFileActionMode } from './sidebar-file-actions-dialog.tsx'

interface UseSidebarFileActionsDialogParams {
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
}

function getFileName(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.at(-1) ?? path
}

export function useSidebarFileActionsDialog({
  onRenameFile,
  onDeleteFile,
}: UseSidebarFileActionsDialogParams) {
  const [mode, setMode] = useState<SidebarFileActionMode | null>(null)
  const [targetPath, setTargetPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

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

  const closeDialog = () => {
    setMode(null)
    setTargetPath(null)
    setRenameValue('')
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

    onDeleteFile(targetPath)
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
