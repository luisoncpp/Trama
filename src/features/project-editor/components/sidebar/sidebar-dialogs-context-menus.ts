import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'
import { SidebarCreateDialog } from './sidebar-create-dialog.tsx'
import { SidebarFooterActions } from './sidebar-footer-actions.tsx'
import { useSidebarFileContextMenu } from './use-sidebar-file-context-menu'
import { useSidebarFolderContextMenu } from './use-sidebar-folder-context-menu'

export { useSidebarFileContextMenu }
export { useSidebarFolderContextMenu }

export interface SidebarDialogsContextMenus {
  fileContextMenu: ReturnType<typeof useSidebarFileContextMenu>
  folderContextMenu: ReturnType<typeof useSidebarFolderContextMenu>
}

export function useSidebarDialogs(props: {
  onSelectFile: (filePath: string) => Promise<void>
  openEditTagsDialog: (path: string) => void
  openRenameDialog: (path: string) => void
  openDeleteDialog: (path: string) => void
  openRenameFolderDialog: (path: string) => void
  openDeleteFolderDialog: (path: string) => void
}) {
  const fileContextMenu = useSidebarFileContextMenu({
    onSelectFile: props.onSelectFile,
    onOpenEditTags: props.openEditTagsDialog,
    onOpenRename: props.openRenameDialog,
    onOpenDelete: props.openDeleteDialog,
  })
  const folderContextMenu = useSidebarFolderContextMenu({
    onOpenRename: props.openRenameFolderDialog,
    onOpenDelete: props.openDeleteFolderDialog,
  })
  return { fileContextMenu, folderContextMenu }
}
