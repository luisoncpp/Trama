import { useState } from 'preact/hooks'

interface UseSidebarFileContextMenuParams {
  onSelectFile: (path: string) => void
  onOpenEditTags: (path: string) => void
  onOpenRename: (path: string) => void
  onOpenDelete: (path: string) => void
}

export function useSidebarFileContextMenu({ onSelectFile, onOpenEditTags, onOpenRename, onOpenDelete }: UseSidebarFileContextMenuParams) {
  const [state, setState] = useState<{ path: string; x: number; y: number } | null>(null)

  const closeContextMenu = () => {
    setState(null)
  }

  const handleFileContextMenu = (path: string, event: MouseEvent) => {
    onSelectFile(path)
    setState({ path, x: event.clientX, y: event.clientY })
  }

  const handleRenameFromContextMenu = () => {
    if (!state) {
      return
    }

    onOpenRename(state.path)
    closeContextMenu()
  }

  const handleEditTagsFromContextMenu = () => {
    if (!state) {
      return
    }

    onOpenEditTags(state.path)
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
    handleFileContextMenu,
    handleEditTagsFromContextMenu,
    handleRenameFromContextMenu,
    handleDeleteFromContextMenu,
  }
}
