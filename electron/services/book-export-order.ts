// @Architecture(descriptionShort="Book export ordering logic: derives base order from tree and applies per-folder")
import type { ProjectIndex, TreeItem } from '../../src/shared/ipc.js'
import {
  folderKeyFromDocumentPath,
  orderIdentityFromCache,
  rankSortByOrder,
} from '../../src/shared/document-order/index.js'

function flattenFileOrder(tree: TreeItem[]): string[] {
  const ordered: string[] = []

  const visit = (items: TreeItem[]): void => {
    for (const item of items) {
      if (item.type === 'file') {
        ordered.push(item.path)
        continue
      }

      if (item.children && item.children.length > 0) {
        visit(item.children)
      }
    }
  }

  visit(tree)
  return ordered
}

function sortFolderByIndex(folderFilesInBaseOrder: string[], index: ProjectIndex): string[] {
  if (folderFilesInBaseOrder.length === 0) {
    return []
  }

  const folder = folderKeyFromDocumentPath(folderFilesInBaseOrder[0])
  return rankSortByOrder(
    folderFilesInBaseOrder,
    index.corkboardOrder[folder] ?? [],
    (filePath) => orderIdentityFromCache(index.cache, filePath),
  )
}

export function orderBookFilesByIndex(baseTree: TreeItem[], index: ProjectIndex): string[] {
  const baseFileOrder = flattenFileOrder(baseTree).filter((filePath) => filePath.startsWith('book/'))
  const byFolder = new Map<string, string[]>()

  for (const filePath of baseFileOrder) {
    const folder = folderKeyFromDocumentPath(filePath)
    const list = byFolder.get(folder) ?? []
    list.push(filePath)
    byFolder.set(folder, list)
  }

  const ordered: string[] = []
  const consumed = new Set<string>()

  for (const filePath of baseFileOrder) {
    const folder = folderKeyFromDocumentPath(filePath)
    if (consumed.has(folder)) {
      continue
    }

    const folderFiles = byFolder.get(folder) ?? []
    const folderSorted = sortFolderByIndex(folderFiles, index)
    for (const sortedPath of folderSorted) {
      ordered.push(sortedPath)
    }
    consumed.add(folder)
  }

  return ordered
}
