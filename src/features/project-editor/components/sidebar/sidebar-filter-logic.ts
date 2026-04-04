import type { SidebarTreeNode, SidebarTreeState } from './sidebar-tree-logic'

export interface SidebarFilterResult {
  query: string
  matchedFilePaths: string[]
  visibleNodePaths: Set<string>
  autoExpandFolderPaths: string[]
}

function matchesQuery(node: SidebarTreeNode, query: string): boolean {
  const normalizedQuery = query.toLocaleLowerCase()
  return (
    node.name.toLocaleLowerCase().includes(normalizedQuery) ||
    node.path.toLocaleLowerCase().includes(normalizedQuery)
  )
}

function addFileAndAncestors(
  tree: SidebarTreeState,
  fileNode: SidebarTreeNode,
  visibleNodePaths: Set<string>,
  autoExpandFolderPaths: Set<string>,
) {
  visibleNodePaths.add(fileNode.path)

  let currentParentId = fileNode.parentId
  while (currentParentId) {
    visibleNodePaths.add(currentParentId)
    autoExpandFolderPaths.add(currentParentId)
    currentParentId = tree.nodesById[currentParentId]?.parentId ?? null
  }
}

export function filterSidebarTree(tree: SidebarTreeState, rawQuery: string): SidebarFilterResult {
  const query = rawQuery.trim()
  if (!query) {
    return {
      query: '',
      matchedFilePaths: [],
      visibleNodePaths: new Set(),
      autoExpandFolderPaths: [],
    }
  }

  const visibleNodePaths = new Set<string>()
  const autoExpandFolderPaths = new Set<string>()
  const matchedFilePaths: string[] = []

  for (const node of Object.values(tree.nodesById)) {
    if (node.type !== 'file') {
      continue
    }

    if (!matchesQuery(node, query)) {
      continue
    }

    matchedFilePaths.push(node.path)
    addFileAndAncestors(tree, node, visibleNodePaths, autoExpandFolderPaths)
  }

  return {
    query,
    matchedFilePaths,
    visibleNodePaths,
    autoExpandFolderPaths: Array.from(autoExpandFolderPaths),
  }
}