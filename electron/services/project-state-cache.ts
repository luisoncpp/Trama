import type { TreeItem, DocumentMeta } from '../../src/shared/ipc.js'

interface CachedState {
  rootPath: string
  tree: TreeItem[]
  markdownFiles: string[]
  metaByPath: Record<string, DocumentMeta>
}

let cache: CachedState | null = null

export function setProjectCache(
  rootPath: string,
  tree: TreeItem[],
  markdownFiles: string[],
  metaByPath: Record<string, DocumentMeta>,
): void {
  cache = {
    rootPath,
    tree,
    markdownFiles,
    metaByPath,
  }
}

export function getProjectCache(rootPath: string): CachedState | null {
  if (!cache || cache.rootPath !== rootPath) {
    return null
  }
  return cache
}

export function clearProjectCache(): void {
  cache = null
}
