// @Architecture(descriptionShort="Private implementation detail for parent module")
import { reconcileFolderOrder } from './document-order-rank.js'

export type PathRename = {
  from?: string
  to?: string
}

export type DocumentOrderRemaps = {
  renamedFolders?: PathRename[]
  renamedFiles?: PathRename[]
}

function remapUnderFolder(pathValue: string, from: string, to: string): string | null {
  if (pathValue === from) {
    return to
  }
  const fromPrefix = from.endsWith('/') ? from : `${from}/`
  if (!pathValue.startsWith(fromPrefix)) {
    return null
  }
  const toPrefix = to.endsWith('/') ? to : `${to}/`
  return `${toPrefix}${pathValue.slice(fromPrefix.length)}`
}

function mergeIdentityLists(primary: string[], secondary: string[]): string[] {
  return reconcileFolderOrder(primary, [...primary, ...secondary])
}

function applyFolderRenameToOrder(
  corkboardOrder: Record<string, string[]>,
  from: string,
  to: string,
): Record<string, string[]> {
  const remapped: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(corkboardOrder)) {
    const newKey = remapUnderFolder(key, from, to) ?? key
    const newIds = ids.map((id) => remapUnderFolder(id, from, to) ?? id)
    remapped[newKey] = remapped[newKey] ? mergeIdentityLists(remapped[newKey], newIds) : newIds
  }
  return remapped
}

function applyFileRenameToOrder(
  corkboardOrder: Record<string, string[]>,
  from: string,
  to: string,
): Record<string, string[]> {
  const remapped: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(corkboardOrder)) {
    remapped[key] = ids.map((id) => (id === from ? to : id))
  }
  return remapped
}

export function remapDocumentOrder(
  corkboardOrder: Record<string, string[]>,
  remaps: DocumentOrderRemaps | undefined,
): Record<string, string[]> {
  let next = { ...corkboardOrder }

  for (const rename of remaps?.renamedFolders ?? []) {
    if (!rename.from || !rename.to) {
      continue
    }
    next = applyFolderRenameToOrder(next, rename.from, rename.to)
  }

  for (const rename of remaps?.renamedFiles ?? []) {
    if (!rename.from || !rename.to) {
      continue
    }
    next = applyFileRenameToOrder(next, rename.from, rename.to)
  }

  return next
}
