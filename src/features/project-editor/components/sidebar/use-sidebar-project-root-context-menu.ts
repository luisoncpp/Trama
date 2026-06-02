import { useState } from 'preact/hooks'

interface UseSidebarProjectRootContextMenuParams {
  hasProject: boolean
  onPickFolder: () => void
  onCloseProject: () => void
  onRevealInFileManager: () => void
}

export function useSidebarProjectRootContextMenu({
  hasProject,
  onPickFolder,
  onCloseProject,
  onRevealInFileManager,
}: UseSidebarProjectRootContextMenuParams) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  const closeContextMenu = () => {
    setPosition(null)
  }

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setPosition({ x: event.clientX, y: event.clientY })
  }

  const handleSelectProject = () => {
    closeContextMenu()
    onPickFolder()
  }

  const handleRevealInFileManager = () => {
    if (!hasProject) {
      return
    }
    closeContextMenu()
    void onRevealInFileManager()
  }

  const handleCloseProject = () => {
    if (!hasProject) {
      return
    }
    closeContextMenu()
    void onCloseProject()
  }

  return {
    contextMenuPosition: position,
    handleContextMenu,
    closeContextMenu,
    handleSelectProject,
    handleRevealInFileManager,
    handleCloseProject,
  }
}
