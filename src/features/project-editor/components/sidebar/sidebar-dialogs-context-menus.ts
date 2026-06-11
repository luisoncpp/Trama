import { useScopedSidebarActions } from './use-scoped-sidebar-actions'
import {
  useSidebarFileContextMenu,
  useSidebarFolderContextMenu,
} from './sidebar-explorer-hooks'

export { useSidebarFileContextMenu }
export { useSidebarFolderContextMenu }

export interface SidebarDialogsContextMenus {
  fileContextMenu: ReturnType<typeof useSidebarFileContextMenu>
  folderContextMenu: ReturnType<typeof useSidebarFolderContextMenu>
}

export function useSidebarDialogs(props: {
  openEditTagsDialog: (path: string) => void
  openRenameDialog: (path: string) => void
  openDeleteDialog: (path: string) => void
  openRenameFolderDialog: (path: string) => void
  openDeleteFolderDialog: (path: string) => void
}) {
  const actions = useScopedSidebarActions()
  const fileContextMenu = useSidebarFileContextMenu({
    onSelectFile: actions.selectFile,
    onOpenEditTags: props.openEditTagsDialog,
    onOpenRename: props.openRenameDialog,
    onOpenDelete: props.openDeleteDialog,
    onOpenReveal: actions.revealInFileManager,
  })
  const folderContextMenu = useSidebarFolderContextMenu({
    onOpenRename: props.openRenameFolderDialog,
    onOpenDelete: props.openDeleteFolderDialog,
    onOpenReveal: actions.revealInFileManager,
  })
  return { fileContextMenu, folderContextMenu }
}
