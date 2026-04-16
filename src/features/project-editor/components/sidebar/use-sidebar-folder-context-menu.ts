import { useState } from 'preact/hooks'

interface UseSidebarFolderContextMenuParams {
  onOpenRename: (path: string) => void
  onOpenDelete: (path: string) => void
}

export function useSidebarFolderContextMenu({ onOpenRename, onOpenDelete }: UseSidebarFolderContextMenuParams) {
  const [state, setState] = useState<{ path: string; x: number; y: number } | null>(null)

  const closeContextMenu = () => {
    setState(null)
  }

  const handleFolderContextMenu = (path: string, event: MouseEvent) => {
    setState({ path, x: event.clientX, y: event.clientY })
  }

  const handleRenameFromContextMenu = () => {
    if (!state) {
      return
    }

    onOpenRename(state.path)
    closeContextMenu()
  }

  const handleDeleteFromContextMenu = () => {
    if (!state) {
      return
    }

    onOpenDelete(state.path)
    closeContextMenu()
  }

  return {
    contextMenuState: state,
    closeContextMenu,
    handleFolderContextMenu,
    handleRenameFromContextMenu,
    handleDeleteFromContextMenu,
  }
}
