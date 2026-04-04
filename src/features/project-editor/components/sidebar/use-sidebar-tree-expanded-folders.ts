import { useEffect, useRef, useState } from 'preact/hooks'
import { buildSidebarTree, getAncestorFolderPaths } from './sidebar-tree-logic'

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function getFolderPaths(tree: ReturnType<typeof buildSidebarTree>): Set<string> {
  return new Set(
    Object.values(tree.nodesById)
      .filter((node) => node.type === 'folder')
      .map((node) => node.path),
  )
}

function getRootFolderPaths(tree: ReturnType<typeof buildSidebarTree>): string[] {
  return tree.rootIds
    .map((id) => tree.nodesById[id])
    .filter((node) => node?.type === 'folder')
    .map((node) => node.path)
}

function buildExpandedSeed(
  previousExpanded: string[],
  folderPaths: Set<string>,
  rootFolders: string[],
  selectedPath: string | null,
): string[] {
  const selectedAncestors = selectedPath ? getAncestorFolderPaths(selectedPath) : []
  const previousValid = previousExpanded.filter((path) => folderPaths.has(path))
  const seed = previousValid.length > 0 ? previousValid : rootFolders
  return unique([...seed, ...selectedAncestors])
}

function restoreExpandedFolders(
  previousExpanded: string[] | null,
  tree: ReturnType<typeof buildSidebarTree>,
): string[] {
  if (!previousExpanded) {
    return []
  }

  const folderPaths = getFolderPaths(tree)
  return previousExpanded.filter((path) => folderPaths.has(path))
}

export function useSidebarTreeExpandedFolders(
  tree: ReturnType<typeof buildSidebarTree>,
  selectedPath: string | null,
  filterQuery: string,
  autoExpandedFolders: string[],
): [(path: string, expanded: boolean) => void, string[]] {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const previousExpandedBeforeFilterRef = useRef<string[] | null>(null)
  const wasFilterActiveRef = useRef(false)

  useEffect(() => {
    const folderPaths = getFolderPaths(tree)
    const rootFolders = getRootFolderPaths(tree)
    setExpandedFolders((prev) => buildExpandedSeed(prev, folderPaths, rootFolders, selectedPath))
  }, [selectedPath, tree])

  useEffect(() => {
    const isFilterActive = filterQuery.trim().length > 0

    if (isFilterActive && !wasFilterActiveRef.current) {
      previousExpandedBeforeFilterRef.current = expandedFolders
    }

    if (!isFilterActive && wasFilterActiveRef.current) {
      setExpandedFolders(restoreExpandedFolders(previousExpandedBeforeFilterRef.current, tree))
      previousExpandedBeforeFilterRef.current = null
    }

    wasFilterActiveRef.current = isFilterActive
  }, [expandedFolders, filterQuery, tree])

  const setFolderExpanded = (path: string, expanded: boolean) => {
    setExpandedFolders((current) => {
      if (expanded) {
        return unique([...current, path])
      }

      return current.filter((entry) => entry !== path)
    })
  }

  const effectiveExpandedFolders =
    filterQuery.trim().length > 0 ? unique([...expandedFolders, ...autoExpandedFolders]) : expandedFolders

  return [setFolderExpanded, effectiveExpandedFolders]
}
