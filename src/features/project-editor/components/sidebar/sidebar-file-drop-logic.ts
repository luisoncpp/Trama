import type { DropIndicatorPosition } from './drop-indicator'
import type { SidebarTreeRow } from './sidebar-tree-types'

export async function handleFileCrossFolderDrop(
  rows: SidebarTreeRow[],
  sourceRow: SidebarTreeRow,
  draggingPath: string,
  dropPosition: DropIndicatorPosition,
  targetFolder: string,
  targetRow: SidebarTreeRow | undefined,
  onMoveFile: ((sourcePath: string, targetFolder: string) => Promise<void>) | undefined,
  onReorderFiles: ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined,
): Promise<void> {
  await onMoveFile?.(draggingPath, targetFolder)

  const fileName = draggingPath.includes('/') ? draggingPath.split('/').pop() ?? draggingPath : draggingPath
  const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName

  const targetDepth = targetRow ? targetRow.depth : sourceRow.depth
  const destSiblings = rows.filter(
    (r) => r.type === 'file' && r.depth === targetDepth && (targetFolder === '' ? !r.path.includes('/') : r.path.startsWith(`${targetFolder}/`)),
  )
  const reorderedIds = destSiblings.map((r) => r.path)

  if (dropPosition.type === 'before' && targetRow) {
    const idx = reorderedIds.indexOf(targetRow.path)
    if (idx !== -1) reorderedIds.splice(idx, 0, newPath)
    else reorderedIds.push(newPath)
  } else if (dropPosition.type === 'after' && targetRow) {
    const idx = reorderedIds.indexOf(targetRow.path)
    if (idx !== -1) reorderedIds.splice(idx + 1, 0, newPath)
    else reorderedIds.push(newPath)
  }

  await onReorderFiles?.(targetFolder, reorderedIds)
}

export async function handleFileSameFolderReorder(
  rows: SidebarTreeRow[],
  sourceRow: SidebarTreeRow,
  draggingPath: string,
  dropPosition: DropIndicatorPosition,
  sourceFolder: string,
  onReorderFiles: ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined,
): Promise<void> {
  const siblingFiles = rows.filter(
    (r) => r.type === 'file' && r.depth === sourceRow.depth && (sourceFolder === '' ? !r.path.includes('/') : r.path.startsWith(`${sourceFolder}/`)),
  )
  const reorderedIds = siblingFiles.map((r) => r.path)
  const sourceIndex = reorderedIds.indexOf(draggingPath)
  if (sourceIndex === -1) return
  reorderedIds.splice(sourceIndex, 1)

  if (dropPosition.type === 'before' && dropPosition.targetIndex !== undefined) {
    const targetRowLocal = rows[dropPosition.targetIndex]
    if (targetRowLocal) {
      const targetIndex = reorderedIds.indexOf(targetRowLocal.path)
      if (targetIndex !== -1) reorderedIds.splice(targetIndex, 0, draggingPath)
    }
  } else if (dropPosition.type === 'after' && dropPosition.targetIndex !== undefined) {
    const targetRowLocal = rows[dropPosition.targetIndex]
    if (targetRowLocal) {
      const targetIndex = reorderedIds.indexOf(targetRowLocal.path)
      if (targetIndex !== -1) reorderedIds.splice(targetIndex + 1, 0, draggingPath)
    }
  }

  await onReorderFiles?.(sourceFolder, reorderedIds)
}
