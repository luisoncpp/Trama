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

function keepValidExpanded(previousExpanded: string[], folderPaths: Set<string>): string[] {
  return previousExpanded.filter((path) => folderPaths.has(path))
}

function getSeededExpandedFolders(params: {
  previousExpanded: string[]
  folderPaths: Set<string>
  rootFolders: string[]
  didInitialize: boolean
  treeChanged: boolean
}): string[] {
  const previousValid = keepValidExpanded(params.previousExpanded, params.folderPaths)
  if (!params.didInitialize) {
    return previousValid.length > 0 ? previousValid : params.rootFolders
  }

  if (params.treeChanged && params.previousExpanded.length === 0 && params.rootFolders.length > 0) {
    return params.rootFolders
  }

  if (previousValid.length === 0 && params.previousExpanded.length > 0) {
    return params.rootFolders
  }

  return previousValid
}

function getFolderTreeKey(folderPaths: Set<string>): string {
  return Array.from(folderPaths).sort().join('|')
}

function useSeedExpandedFolders(
  tree: ReturnType<typeof buildSidebarTree>,
  didInitializeRef: { current: boolean },
  previousTreeKeyRef: { current: string },
  setExpandedFolders: (updater: (prev: string[]) => string[]) => void,
): void {
  useEffect(() => {
    const folderPaths = getFolderPaths(tree)
    const rootFolders = getRootFolderPaths(tree)
    const treeKey = getFolderTreeKey(folderPaths)
    const treeChanged = previousTreeKeyRef.current !== treeKey

    setExpandedFolders((prev) =>
      getSeededExpandedFolders({
        previousExpanded: prev,
        folderPaths,
        rootFolders,
        didInitialize: didInitializeRef.current,
        treeChanged,
      }),
    )

    didInitializeRef.current = true
    previousTreeKeyRef.current = treeKey
  }, [didInitializeRef, previousTreeKeyRef, setExpandedFolders, tree])
}

function useExpandSelectedPathAncestors(
  tree: ReturnType<typeof buildSidebarTree>,
  selectedPath: string | null,
  setExpandedFolders: (updater: (prev: string[]) => string[]) => void,
): void {
  useEffect(() => {
    if (!selectedPath) {
      return
    }

    const folderPaths = getFolderPaths(tree)
    const ancestors = getAncestorFolderPaths(selectedPath).filter((path) => folderPaths.has(path))
    if (ancestors.length === 0) {
      return
    }

    setExpandedFolders((prev) => unique([...keepValidExpanded(prev, folderPaths), ...ancestors]))
  }, [selectedPath, setExpandedFolders, tree])
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
  const didInitializeRef = useRef(false)
  const previousTreeKeyRef = useRef('')

  useSeedExpandedFolders(tree, didInitializeRef, previousTreeKeyRef, setExpandedFolders)
  useExpandSelectedPathAncestors(tree, selectedPath, setExpandedFolders)

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
