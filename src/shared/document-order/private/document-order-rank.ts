// @Architecture(descriptionShort="Private implementation detail for parent module")
import { folderKeyFromDocumentPath, orderIdentity } from './document-order-identity.js'

export function reconcileFolderOrder(
  previousOrder: readonly string[],
  currentIdentities: readonly string[],
): string[] {
  const available = new Set(currentIdentities)
  const kept = previousOrder.filter((id) => available.has(id))
  const missing = currentIdentities.filter((id) => !kept.includes(id))
  return [...kept, ...missing]
}

export function rebuildDocumentOrder(
  markdownFiles: readonly string[],
  metaByPath: Record<string, { id?: unknown } | undefined>,
  previousOrderByFolder: Record<string, string[]>,
): Record<string, string[]> {
  const idsByFolder = new Map<string, string[]>()
  for (const filePath of markdownFiles) {
    const folder = folderKeyFromDocumentPath(filePath)
    const list = idsByFolder.get(folder) ?? []
    list.push(orderIdentity(metaByPath[filePath], filePath))
    idsByFolder.set(folder, list)
  }

  const corkboardOrder: Record<string, string[]> = {}
  for (const [folder, ids] of idsByFolder.entries()) {
    corkboardOrder[folder] = reconcileFolderOrder(previousOrderByFolder[folder] ?? [], ids)
  }
  return corkboardOrder
}

export function rankSortByOrder<T>(
  items: readonly T[],
  orderList: readonly string[],
  getIdentity: (item: T) => string,
  compareUnranked: (left: T, right: T) => number = () => 0,
): T[] {
  if (items.length === 0) {
    return []
  }

  if (orderList.length === 0) {
    return [...items].sort(compareUnranked)
  }

  const rankById = new Map<string, number>()
  for (let i = 0; i < orderList.length; i++) {
    rankById.set(orderList[i], i)
  }

  return [...items].sort((left, right) => {
    const leftRank = rankById.get(getIdentity(left))
    const rightRank = rankById.get(getIdentity(right))
    if (leftRank != null && rightRank != null) {
      return leftRank - rightRank
    }
    if (leftRank != null) {
      return -1
    }
    if (rightRank != null) {
      return 1
    }
    return compareUnranked(left, right)
  })
}
