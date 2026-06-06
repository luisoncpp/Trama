import { useEffect, useState } from 'preact/hooks'

import { SIDEBAR_RESPONSIVE_BREAKPOINT_PX } from '../../layout/layout-metrics'

function isNarrowViewport(): boolean {
  return window.innerWidth <= SIDEBAR_RESPONSIVE_BREAKPOINT_PX
}

export function useSidebarResponsiveCollapse(): boolean {
  const [isNarrow, setIsNarrow] = useState<boolean>(isNarrowViewport)

  useEffect(() => {
    const onResize = () => {
      setIsNarrow(isNarrowViewport())
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return isNarrow
}

interface UseSidebarFilterShortcutParams {
  enabled: boolean
  focusFilterInput: () => void
}

function useSidebarFilterShortcut({ enabled, focusFilterInput }: UseSidebarFilterShortcutParams): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        focusFilterInput()
      }
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [enabled, focusFilterInput])
}

interface UseSidebarFileContextMenuParams {
  onSelectFile: (path: string) => Promise<void>
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
    void onSelectFile(path)
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
