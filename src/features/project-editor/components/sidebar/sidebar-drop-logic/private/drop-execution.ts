import type { DropIndicatorPosition } from '../../drop-indicator'
import type { SidebarTreeRow } from '../../sidebar-tree-logic'
import { handleFileCrossFolderDrop, handleFileSameFolderReorder } from './file-reorder'

export interface ExecuteDropInput {
  rows: SidebarTreeRow[]
  draggingPath: string
  dropPosition: DropIndicatorPosition
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
}

async function handleFolderDrop(
  sourceRow: SidebarTreeRow,
  draggingPath: string,
  dropPosition: DropIndicatorPosition,
  onMoveFolder: ExecuteDropInput['onMoveFolder'],
): Promise<void> {
  if (dropPosition.type === 'onFolder' && dropPosition.targetPath !== undefined) {
    if (dropPosition.targetPath === sourceRow.path) return
    if (dropPosition.targetPath.startsWith(`${sourceRow.path}/`)) return
    await onMoveFolder?.(draggingPath, dropPosition.targetPath)
    return
  }
  if (dropPosition.type === 'onSection') {
    await onMoveFolder?.(draggingPath, '')
  }
}

async function handleFileDrop(
  rows: SidebarTreeRow[],
  sourceRow: SidebarTreeRow,
  draggingPath: string,
  dropPosition: DropIndicatorPosition,
  onMoveFile: ExecuteDropInput['onMoveFile'],
  onReorderFiles: ExecuteDropInput['onReorderFiles'],
): Promise<void> {
  if (dropPosition.type === 'onFolder' && dropPosition.targetPath !== undefined) {
    if (dropPosition.targetPath === sourceRow.path) return
    const parentPath = sourceRow.path.includes('/') ? sourceRow.path.split('/').slice(0, -1).join('/') : ''
    if (parentPath === dropPosition.targetPath) return
    await onMoveFile?.(draggingPath, dropPosition.targetPath)
    return
  }

  const sourceFolder = sourceRow.path.includes('/') ? sourceRow.path.split('/').slice(0, -1).join('/') : ''
  let targetFolder = sourceFolder
  let targetRow: SidebarTreeRow | undefined

  if ((dropPosition.type === 'before' || dropPosition.type === 'after') && dropPosition.targetIndex !== undefined) {
    targetRow = rows[dropPosition.targetIndex]
    if (targetRow) {
      targetFolder = targetRow.path.includes('/') ? targetRow.path.split('/').slice(0, -1).join('/') : ''
    }
  }

  if (targetFolder !== sourceFolder) {
    await handleFileCrossFolderDrop(rows, sourceRow, draggingPath, dropPosition, targetFolder, targetRow, onMoveFile, onReorderFiles)
    return
  }

  await handleFileSameFolderReorder(rows, sourceRow, draggingPath, dropPosition, sourceFolder, onReorderFiles)
}

export async function executeDrop({
  rows,
  draggingPath,
  dropPosition,
  onMoveFile,
  onMoveFolder,
  onReorderFiles,
}: ExecuteDropInput): Promise<void> {
  const sourceRow = rows.find((r) => r.path === draggingPath)
  if (!sourceRow) return
  if (sourceRow.type === 'folder') {
    await handleFolderDrop(sourceRow, draggingPath, dropPosition, onMoveFolder)
    return
  }
  await handleFileDrop(rows, sourceRow, draggingPath, dropPosition, onMoveFile, onReorderFiles)
}
