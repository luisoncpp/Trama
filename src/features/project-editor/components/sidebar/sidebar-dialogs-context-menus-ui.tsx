import { SidebarFileContextMenu } from './sidebar-file-context-menu.tsx'
import { SidebarFolderContextMenu } from './sidebar-folder-context-menu.tsx'
import { useSidebarFileContextMenu, useSidebarFolderContextMenu } from './sidebar-dialogs-context-menus'

type FileContextMenuResult = ReturnType<typeof useSidebarFileContextMenu>
type FolderContextMenuResult = ReturnType<typeof useSidebarFolderContextMenu>

interface FileContextMenuProps {
  contextMenu: FileContextMenuResult
}

export function FileContextMenu({ contextMenu }: FileContextMenuProps) {
  const position = contextMenu.contextMenuState
    ? { x: contextMenu.contextMenuState.x, y: contextMenu.contextMenuState.y }
    : null
  return (
    <SidebarFileContextMenu
      isOpen={Boolean(contextMenu.contextMenuState)}
      position={position}
      onEditTags={contextMenu.handleEditTagsFromContextMenu}
      onRename={contextMenu.handleRenameFromContextMenu}
      onDelete={contextMenu.handleDeleteFromContextMenu}
      onClose={contextMenu.closeContextMenu}
    />
  )
}

interface FolderContextMenuProps {
  contextMenu: FolderContextMenuResult
}

export function FolderContextMenu({ contextMenu }: FolderContextMenuProps) {
  const position = contextMenu.contextMenuState
    ? { x: contextMenu.contextMenuState.x, y: contextMenu.contextMenuState.y }
    : null
  return (
    <SidebarFolderContextMenu
      isOpen={Boolean(contextMenu.contextMenuState)}
      position={position}
      onRename={contextMenu.handleRenameFromContextMenu}
      onDelete={contextMenu.handleDeleteFromContextMenu}
      onClose={contextMenu.closeContextMenu}
    />
  )
}

interface ContextMenusProps {
  fileContextMenu: FileContextMenuResult
  folderContextMenu: FolderContextMenuResult
}

export function ContextMenus({ fileContextMenu, folderContextMenu }: ContextMenusProps) {
  return (
    <>
      <FileContextMenu contextMenu={fileContextMenu} />
      <FolderContextMenu contextMenu={folderContextMenu} />
    </>
  )
}
