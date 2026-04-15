import path from 'node:path'
import type { ProjectIndex, TreeItem } from '../../src/shared/ipc.js'

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

function folderFromPath(relativePath: string): string {
  const folder = path.posix.dirname(relativePath)
  return folder === '.' ? '' : folder
}

function idFromIndex(index: ProjectIndex, filePath: string): string {
  const meta = index.cache[filePath]
  if (meta && typeof meta.id === 'string' && meta.id.trim()) {
    return meta.id
  }

  return filePath
}

function sortFolderByIndex(folderFilesInBaseOrder: string[], index: ProjectIndex): string[] {
  if (folderFilesInBaseOrder.length === 0) {
    return []
  }

  const folder = folderFromPath(folderFilesInBaseOrder[0])
  const explicitOrder = index.corkboardOrder[folder] ?? []
  if (explicitOrder.length === 0) {
    return folderFilesInBaseOrder
  }

  const rankById = new Map<string, number>()
  for (let i = 0; i < explicitOrder.length; i++) {
    rankById.set(explicitOrder[i], i)
  }

  return [...folderFilesInBaseOrder].sort((left, right) => {
    const leftRank = rankById.get(idFromIndex(index, left))
    const rightRank = rankById.get(idFromIndex(index, right))

    if (leftRank != null && rightRank != null) {
      return leftRank - rightRank
    }

    if (leftRank != null) {
      return -1
    }

    if (rightRank != null) {
      return 1
    }

    return 0
  })
}

export function orderBookFilesByIndex(baseTree: TreeItem[], index: ProjectIndex): string[] {
  const baseFileOrder = flattenFileOrder(baseTree).filter((filePath) => filePath.startsWith('book/'))
  const byFolder = new Map<string, string[]>()

  for (const filePath of baseFileOrder) {
    const folder = folderFromPath(filePath)
    const list = byFolder.get(folder) ?? []
    list.push(filePath)
    byFolder.set(folder, list)
  }

  const ordered: string[] = []
  const consumed = new Set<string>()

  for (const filePath of baseFileOrder) {
    const folder = folderFromPath(filePath)
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
