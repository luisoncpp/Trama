import type { TreeItem, DocumentMeta } from '../../src/shared/ipc.js'
import { DocumentRepository } from './document-repository.js'

const documentRepository = new DocumentRepository()

export interface IncrementalChanges {
  createdFiles?: string[]
  deletedFiles?: string[]
  renamedFiles?: { from?: string; to?: string }[]
  createdFolders?: string[]
  deletedFolders?: string[]
  renamedFolders?: { from?: string; to?: string }[]
}

export interface CachedProjectState {
  tree: TreeItem[]
  markdownFiles: string[]
  metaByPath: Record<string, DocumentMeta>
}

export async function applyIncrementalUpdate(
  cache: CachedProjectState,
  changes: IncrementalChanges,
  projectRoot: string,
): Promise<CachedProjectState> {
  let markdownFiles = [...cache.markdownFiles]
  let metaByPath: Record<string, DocumentMeta> = { ...cache.metaByPath }
  let tree = deepCloneTree(cache.tree)

  // Process deletions first to avoid conflicts with renames/creates
  if (changes.deletedFolders) {
    for (const folderPath of changes.deletedFolders) {
      const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`
      markdownFiles = markdownFiles.filter((f) => !f.startsWith(prefix))
      for (const filePath of Object.keys(metaByPath)) {
        if (filePath.startsWith(prefix)) {
          delete metaByPath[filePath]
        }
      }
      tree = removeFolderFromTree(tree, folderPath)
    }
  }

  if (changes.deletedFiles) {
    for (const filePath of changes.deletedFiles) {
      markdownFiles = markdownFiles.filter((f) => f !== filePath)
      delete metaByPath[filePath]
      tree = removeFileFromTree(tree, filePath)
    }
  }

  if (changes.renamedFolders) {
    for (const rename of changes.renamedFolders) {
      if (!rename.from || !rename.to) continue
      const from = rename.from
      const to = rename.to
      const oldPrefix = from.endsWith('/') ? from : `${from}/`
      const newPrefix = to.endsWith('/') ? to : `${to}/`

      const updatedFiles: string[] = []
      for (const filePath of markdownFiles) {
        if (filePath.startsWith(oldPrefix)) {
          updatedFiles.push(`${newPrefix}${filePath.slice(oldPrefix.length)}`)
        } else {
          updatedFiles.push(filePath)
        }
      }
      markdownFiles = updatedFiles

      const updatedMeta: Record<string, DocumentMeta> = {}
      for (const [key, value] of Object.entries(metaByPath)) {
        if (key.startsWith(oldPrefix)) {
          updatedMeta[`${newPrefix}${key.slice(oldPrefix.length)}`] = value
        } else {
          updatedMeta[key] = value
        }
      }
      metaByPath = updatedMeta

      tree = renameFolderInTree(tree, from, to)
    }
  }

  if (changes.renamedFiles) {
    for (const rename of changes.renamedFiles) {
      if (!rename.from || !rename.to) continue
      const from = rename.from
      const to = rename.to
      markdownFiles = markdownFiles.map((f) => (f === from ? to : f))
      if (metaByPath[from] !== undefined) {
        metaByPath[to] = metaByPath[from]
        delete metaByPath[from]
      }
      tree = renameFileInTree(tree, from, to)
    }
  }

  if (changes.createdFolders) {
    for (const folderPath of changes.createdFolders) {
      tree = ensureFolderInTree(tree, folderPath)
    }
  }

  if (changes.createdFiles) {
    for (const filePath of changes.createdFiles) {
      if (!markdownFiles.includes(filePath)) {
        markdownFiles.push(filePath)
      }
      try {
        const doc = await documentRepository.readDocument(projectRoot, filePath)
        metaByPath[filePath] = doc.meta
      } catch {
        metaByPath[filePath] = {}
      }
      tree = addFileToTree(tree, filePath)
    }
  }

  return {
    tree,
    markdownFiles: markdownFiles.sort((a, b) => a.localeCompare(b, 'es')),
    metaByPath,
  }
}

// ─── Tree manipulation helpers ───

function deepCloneTree(tree: TreeItem[]): TreeItem[] {
  return tree.map((node) => ({
    ...node,
    children: node.children ? deepCloneTree(node.children) : undefined,
  }))
}

function pathSegments(relativePath: string): string[] {
  return relativePath.split('/').filter(Boolean)
}

function getParentPath(relativePath: string): string {
  const segments = pathSegments(relativePath)
  segments.pop()
  return segments.join('/')
}

function getFileName(relativePath: string): string {
  const segments = pathSegments(relativePath)
  return segments[segments.length - 1] ?? ''
}

function findFolderNode(tree: TreeItem[], folderPath: string): TreeItem | null {
  const segments = pathSegments(folderPath)
  let current = tree
  let node: TreeItem | null = null
  for (const segment of segments) {
    const found = current.find((n) => n.type === 'folder' && n.title === segment)
    if (!found) return null
    node = found
    current = found.children ?? []
  }
  return node
}

function ensureFolderInTree(tree: TreeItem[], folderPath: string): TreeItem[] {
  const segments = pathSegments(folderPath)
  let current = tree
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const existingIndex = current.findIndex((n) => n.type === 'folder' && n.title === segment)
    if (existingIndex === -1) {
      const newFolderPath = segments.slice(0, i + 1).join('/')
      const newNode: TreeItem = {
        id: newFolderPath,
        title: segment,
        path: newFolderPath,
        type: 'folder',
        children: [],
      }
      const folderCount = current.filter((n) => n.type === 'folder').length
      const insertIndex = current.findIndex(
        (n) => n.type === 'folder' && n.title.localeCompare(segment, 'es') > 0,
      )
      current.splice(insertIndex === -1 ? folderCount : insertIndex, 0, newNode)
      current = newNode.children ?? []
    } else {
      current = current[existingIndex].children ?? []
    }
  }
  return tree
}

function addFileToTree(tree: TreeItem[], filePath: string): TreeItem[] {
  const parentPath = getParentPath(filePath)
  const fileName = getFileName(filePath)
  const displayName = fileName.replace(/\.md$/i, '')

  const updatedTree = parentPath ? ensureFolderInTree(tree, parentPath) : tree

  const parentNode = parentPath ? findFolderNode(updatedTree, parentPath) : null
  const siblings = parentNode ? (parentNode.children ?? []) : updatedTree

  if (siblings.some((n) => n.type === 'file' && n.title === displayName)) {
    return updatedTree
  }

  const newNode: TreeItem = {
    id: filePath,
    title: displayName,
    path: filePath,
    type: 'file',
  }

  const folderCount = siblings.filter((n) => n.type === 'folder').length
  const fileSlice = siblings.slice(folderCount)
  const fileIndex = fileSlice.findIndex(
    (n) => n.title.localeCompare(newNode.title, 'es') > 0,
  )
  const insertIndex = folderCount + (fileIndex === -1 ? fileSlice.length : fileIndex)
  siblings.splice(insertIndex, 0, newNode)

  return updatedTree
}

function removeFileFromTree(tree: TreeItem[], filePath: string): TreeItem[] {
  const parentPath = getParentPath(filePath)
  const fileName = getFileName(filePath)
  const displayName = fileName.replace(/\.md$/i, '')

  const parentNode = parentPath ? findFolderNode(tree, parentPath) : null
  const siblings = parentNode ? (parentNode.children ?? []) : tree

  const index = siblings.findIndex((n) => n.type === 'file' && n.title === displayName)
  if (index !== -1) {
    siblings.splice(index, 1)
  }

  return tree
}

function removeFolderFromTree(tree: TreeItem[], folderPath: string): TreeItem[] {
  const parentPath = getParentPath(folderPath)
  const folderName = getFileName(folderPath)

  const parentNode = parentPath ? findFolderNode(tree, parentPath) : null
  const siblings = parentNode ? (parentNode.children ?? []) : tree

  const index = siblings.findIndex((n) => n.type === 'folder' && n.title === folderName)
  if (index !== -1) {
    siblings.splice(index, 1)
  }

  return tree
}

function renameFileInTree(tree: TreeItem[], oldPath: string, newPath: string): TreeItem[] {
  const oldParentPath = getParentPath(oldPath)
  const newParentPath = getParentPath(newPath)
  const oldFileName = getFileName(oldPath).replace(/\.md$/i, '')

  const oldParentNode = oldParentPath ? findFolderNode(tree, oldParentPath) : null
  const oldSiblings = oldParentNode ? (oldParentNode.children ?? []) : tree
  const oldIndex = oldSiblings.findIndex((n) => n.type === 'file' && n.title === oldFileName)
  if (oldIndex !== -1) {
    oldSiblings.splice(oldIndex, 1)
  }

  const updatedTree = newParentPath ? ensureFolderInTree(tree, newParentPath) : tree
  return addFileToTree(updatedTree, newPath)
}

function renameFolderInTree(tree: TreeItem[], oldPath: string, newPath: string): TreeItem[] {
  const parentPath = getParentPath(oldPath)
  const oldName = getFileName(oldPath)
  const newName = getFileName(newPath)

  const parentNode = parentPath ? findFolderNode(tree, parentPath) : null
  const siblings = parentNode ? (parentNode.children ?? []) : tree

  const index = siblings.findIndex((n) => n.type === 'folder' && n.title === oldName)
  if (index === -1) return tree

  const node = siblings[index]
  node.title = newName
  node.id = newPath
  node.path = newPath

  updateDescendantPaths(node, oldPath, newPath)

  const newParentPath = getParentPath(newPath)
  if (newParentPath !== parentPath) {
    siblings.splice(index, 1)
    const newParentNode = newParentPath ? findFolderNode(tree, newParentPath) : null
    const newSiblings = newParentNode ? (newParentNode.children ?? []) : tree
    const folderCount = newSiblings.filter((n) => n.type === 'folder').length
    const insertIndex = newSiblings.findIndex(
      (n) => n.type === 'folder' && n.title.localeCompare(newName, 'es') > 0,
    )
    const finalIndex = insertIndex === -1 ? folderCount : insertIndex
    newSiblings.splice(finalIndex, 0, node)
  } else {
    siblings.splice(index, 1)
    const folderCount = siblings.filter((n) => n.type === 'folder').length
    const insertIndex = siblings.findIndex(
      (n) => n.type === 'folder' && n.title.localeCompare(newName, 'es') > 0,
    )
    const finalIndex = insertIndex === -1 ? folderCount : insertIndex
    siblings.splice(finalIndex, 0, node)
  }

  return tree
}

function updateDescendantPaths(node: TreeItem, oldPrefix: string, newPrefix: string): void {
  if (!node.children) return
  for (const child of node.children) {
    const oldChildPath = child.path
    if (oldChildPath.startsWith(`${oldPrefix}/`)) {
      child.path = `${newPrefix}${oldChildPath.slice(oldPrefix.length)}`
      child.id = child.path
    }
    if (child.children) {
      updateDescendantPaths(child, oldPrefix, newPrefix)
    }
  }
}
