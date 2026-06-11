import { useState } from 'preact/hooks'
import { useEditorActions } from '../../project-editor-actions-context.tsx'

interface UseSidebarProjectRootContextMenuParams {
  hasProject: boolean
}

export function useSidebarProjectRootContextMenu({ hasProject }: UseSidebarProjectRootContextMenuParams) {
  const { pickProjectFolder, closeProject, revealInFileManager } = useEditorActions()
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
    void pickProjectFolder()
  }

  const handleRevealInFileManager = () => {
    if (!hasProject) {
      return
    }
    closeContextMenu()
    void revealInFileManager()
  }

  const handleCloseProject = () => {
    if (!hasProject) {
      return
    }
    closeContextMenu()
    void closeProject()
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
