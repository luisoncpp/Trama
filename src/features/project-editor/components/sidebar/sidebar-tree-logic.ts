export type SidebarTreeNodeType = 'folder' | 'file'

export interface SidebarTreeNode {
  id: string
  name: string
  path: string
  type: SidebarTreeNodeType
  depth: number
  parentId: string | null
  childIds: string[]
}

export interface SidebarTreeState {
  nodesById: Record<string, SidebarTreeNode>
  rootIds: string[]
}

export interface SidebarTreeRow {
  nodeId: string
  path: string
  name: string
  type: SidebarTreeNodeType
  depth: number
  isExpanded: boolean
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function parseSidebarPath(rawPath: string): { path: string; type: SidebarTreeNodeType } | null {
  const normalizedSlashes = rawPath.replaceAll('\\', '/').replace(/^\/+/, '')
  const isFolder = normalizedSlashes.endsWith('/')
  const normalizedPath = normalizedSlashes.replace(/\/+$/, '')
  if (!normalizedPath) {
    return null
  }

  return {
    path: normalizedPath,
    type: isFolder ? 'folder' : 'file',
  }
}

function compareNodeOrder(a: SidebarTreeNode, b: SidebarTreeNode): number {
  if (a.type !== b.type) {
    return a.type === 'folder' ? -1 : 1
  }

  return a.name.localeCompare(b.name)
}

function ensureFolderNode(
  nodesById: Record<string, SidebarTreeNode>,
  rootIds: string[],
  folderPath: string,
  parentId: string | null,
  depth: number,
): string {
  if (!nodesById[folderPath]) {
    const name = folderPath.split('/').at(-1) ?? folderPath
    nodesById[folderPath] = {
      id: folderPath,
      name,
      path: folderPath,
      type: 'folder',
      depth,
      parentId,
      childIds: [],
    }

    if (parentId) {
      nodesById[parentId]?.childIds.push(folderPath)
    } else {
      rootIds.push(folderPath)
    }
  }

  return folderPath
}

function ensureFileNode(
  nodesById: Record<string, SidebarTreeNode>,
  rootIds: string[],
  filePath: string,
  parentId: string | null,
  depth: number,
): void {
  if (nodesById[filePath]) {
    return
  }

  const name = filePath.split('/').at(-1) ?? filePath
  nodesById[filePath] = {
    id: filePath,
    name,
    path: filePath,
    type: 'file',
    depth,
    parentId,
    childIds: [],
  }

  if (parentId) {
    nodesById[parentId]?.childIds.push(filePath)
  } else {
    rootIds.push(filePath)
  }
}

export function buildSidebarTree(sidebarPaths: string[]): SidebarTreeState {
  const nodesById: Record<string, SidebarTreeNode> = {}
  const rootIds: string[] = []

  for (const rawPath of sidebarPaths) {
    const parsedPath = parseSidebarPath(rawPath)
    if (!parsedPath) {
      continue
    }

    const segments = normalizePath(parsedPath.path).split('/').filter(Boolean)
    if (segments.length === 0) {
      continue
    }

    let parentId: string | null = null

    const folderEnd = parsedPath.type === 'folder' ? segments.length : segments.length - 1
    for (let i = 0; i < folderEnd; i += 1) {
      const folderPath = segments.slice(0, i + 1).join('/')
      parentId = ensureFolderNode(nodesById, rootIds, folderPath, parentId, i)
    }

    if (parsedPath.type === 'file') {
      ensureFileNode(nodesById, rootIds, parsedPath.path, parentId, segments.length - 1)
    }
  }

  for (const node of Object.values(nodesById)) {
    node.childIds.sort((leftId, rightId) => compareNodeOrder(nodesById[leftId], nodesById[rightId]))
  }

  rootIds.sort((leftId, rightId) => compareNodeOrder(nodesById[leftId], nodesById[rightId]))

  return { nodesById, rootIds }
}

export function getAncestorFolderPaths(filePath: string): string[] {
  const normalized = normalizePath(filePath)
  const segments = normalized.split('/').filter(Boolean)
  const ancestorFolders: string[] = []

  for (let i = 0; i < segments.length - 1; i += 1) {
    ancestorFolders.push(segments.slice(0, i + 1).join('/'))
  }

  return ancestorFolders
}

export function getVisibleSidebarRows(
  tree: SidebarTreeState,
  expandedFolderPaths: Set<string>,
  visibleNodePaths?: Set<string>,
): SidebarTreeRow[] {
  const rows: SidebarTreeRow[] = []
  const hasVisibilityFilter = visibleNodePaths !== undefined

  const visit = (nodeId: string) => {
    const node = tree.nodesById[nodeId]
    if (!node) {
      return
    }

    if (hasVisibilityFilter && !visibleNodePaths.has(node.path)) {
      return
    }

    const isExpanded = node.type === 'folder' && expandedFolderPaths.has(node.path)
    rows.push({
      nodeId: node.id,
      path: node.path,
      name: node.name,
      type: node.type,
      depth: node.depth,
      isExpanded,
    })

    if (!isExpanded) {
      return
    }

    for (const childId of node.childIds) {
      visit(childId)
    }
  }

  for (const rootId of tree.rootIds) {
    visit(rootId)
  }

  return rows
}

export function findParentRowIndex(rows: SidebarTreeRow[], index: number): number {
  const currentDepth = rows[index]?.depth ?? 0

  for (let i = index - 1; i >= 0; i -= 1) {
    if (rows[i].depth < currentDepth) {
      return i
    }
  }

  return -1
}
