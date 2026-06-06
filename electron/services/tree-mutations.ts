import type { TreeItem } from '../../src/shared/ipc.js'

export function deepCloneTree(tree: TreeItem[]): TreeItem[] {
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

function updateDescendantPaths(node: TreeItem, oldPrefix: string, newPrefix: string): void {
  if (!node.children) return
  for (const child of node.children) {
    const oldChildPath = child.path
    if (oldChildPath.startsWith(`${oldPrefix}/`)) {
      child.path = `${newPrefix}${oldChildPath.slice(oldPrefix.length)}`
      child.id = child.path
    }
    if (child.children) updateDescendantPaths(child, oldPrefix, newPrefix)
  }
}

export function ensureFolderInTree(tree: TreeItem[], folderPath: string): TreeItem[] {
  const segments = pathSegments(folderPath)
  let current = tree
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const existingIndex = current.findIndex((n) => n.type === 'folder' && n.title === segment)
    if (existingIndex === -1) {
      const newFolderPath = segments.slice(0, i + 1).join('/')
      const newNode: TreeItem = { id: newFolderPath, title: segment, path: newFolderPath, type: 'folder', children: [] }
      const folderCount = current.filter((n) => n.type === 'folder').length
      const insertIndex = current.findIndex((n) => n.type === 'folder' && n.title.localeCompare(segment, 'es') > 0)
      current.splice(insertIndex === -1 ? folderCount : insertIndex, 0, newNode)
      current = newNode.children ?? []
    } else {
      current = current[existingIndex].children ?? []
    }
  }
  return tree
}

export function addFileToTree(tree: TreeItem[], filePath: string): TreeItem[] {
  const parentPath = getParentPath(filePath)
  const fileName = getFileName(filePath)
  const displayName = fileName.replace(/\.md$/i, '')
  const updatedTree = parentPath ? ensureFolderInTree(tree, parentPath) : tree
  const parentNode = parentPath ? findFolderNode(updatedTree, parentPath) : null
  const siblings = parentNode ? (parentNode.children ?? []) : updatedTree
  if (siblings.some((n) => n.type === 'file' && n.title === displayName)) return updatedTree
  const newNode: TreeItem = { id: filePath, title: displayName, path: filePath, type: 'file' }
  const folderCount = siblings.filter((n) => n.type === 'folder').length
  const fileSlice = siblings.slice(folderCount)
  const fileIndex = fileSlice.findIndex((n) => n.title.localeCompare(newNode.title, 'es') > 0)
  const insertIndex = folderCount + (fileIndex === -1 ? fileSlice.length : fileIndex)
  siblings.splice(insertIndex, 0, newNode)
  return updatedTree
}

export function removeFileFromTree(tree: TreeItem[], filePath: string): TreeItem[] {
  const parentPath = getParentPath(filePath)
  const parentNode = parentPath ? findFolderNode(tree, parentPath) : null
  const siblings = parentNode ? (parentNode.children ?? []) : tree
  const fileName = getFileName(filePath).replace(/\.md$/i, '')
  const index = siblings.findIndex((n) => n.type === 'file' && n.title === fileName)
  if (index !== -1) siblings.splice(index, 1)
  return tree
}

export function removeFolderFromTree(tree: TreeItem[], folderPath: string): TreeItem[] {
  const parentPath = getParentPath(folderPath)
  const parentNode = parentPath ? findFolderNode(tree, parentPath) : null
  const siblings = parentNode ? (parentNode.children ?? []) : tree
  const folderName = getFileName(folderPath)
  const index = siblings.findIndex((n) => n.type === 'folder' && n.title === folderName)
  if (index !== -1) siblings.splice(index, 1)
  return tree
}

export function renameFileInTree(tree: TreeItem[], oldPath: string, newPath: string): TreeItem[] {
  const oldParentPath = getParentPath(oldPath)
  const newParentPath = getParentPath(newPath)
  const oldFileName = getFileName(oldPath).replace(/\.md$/i, '')
  const oldParentNode = oldParentPath ? findFolderNode(tree, oldParentPath) : null
  const oldSiblings = oldParentNode ? (oldParentNode.children ?? []) : tree
  const oldIndex = oldSiblings.findIndex((n) => n.type === 'file' && n.title === oldFileName)
  if (oldIndex !== -1) oldSiblings.splice(oldIndex, 1)
  const updatedTree = newParentPath ? ensureFolderInTree(tree, newParentPath) : tree
  return addFileToTree(updatedTree, newPath)
}

export function renameFolderInTree(tree: TreeItem[], oldPath: string, newPath: string): TreeItem[] {
  const parentPath = getParentPath(oldPath)
  const oldName = getFileName(oldPath)
  const newName = getFileName(newPath)
  const parentNode = parentPath ? findFolderNode(tree, parentPath) : null
  const siblings = parentNode ? (parentNode.children ?? []) : tree
  const index = siblings.findIndex((n) => n.type === 'folder' && n.title === oldName)
  if (index === -1) return tree
  const node = siblings[index]
  node.title = newName; node.id = newPath; node.path = newPath
  updateDescendantPaths(node, oldPath, newPath)
  const newParentPath = getParentPath(newPath)
  if (newParentPath !== parentPath) {
    siblings.splice(index, 1)
    const newParentNode = newParentPath ? findFolderNode(tree, newParentPath) : null
    const newSiblings = newParentNode ? (newParentNode.children ?? []) : tree
    const folderCount = newSiblings.filter((n) => n.type === 'folder').length
    const insertIdx = newSiblings.findIndex((n) => n.type === 'folder' && n.title.localeCompare(newName, 'es') > 0)
    newSiblings.splice(insertIdx === -1 ? folderCount : insertIdx, 0, node)
  } else {
    siblings.splice(index, 1)
    const folderCount = siblings.filter((n) => n.type === 'folder').length
    const insertIdx = siblings.findIndex((n) => n.type === 'folder' && n.title.localeCompare(newName, 'es') > 0)
    siblings.splice(insertIdx === -1 ? folderCount : insertIdx, 0, node)
  }
  return tree
}
