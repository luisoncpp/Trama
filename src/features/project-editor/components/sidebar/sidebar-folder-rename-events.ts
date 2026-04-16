interface SidebarFolderPathRemapEvent {
  oldPath: string
  newPath: string
}

let pendingPathRemapEvent: SidebarFolderPathRemapEvent | null = null

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function withTrailingSlash(path: string): string {
  return `${normalizePath(path)}/`
}

function remapPrefix(path: string, oldPrefix: string, newPrefix: string): string {
  const normalizedPath = normalizePath(path)
  const fromPrefix = withTrailingSlash(oldPrefix)
  if (!normalizedPath.startsWith(fromPrefix)) {
    return normalizedPath
  }

  const toPrefix = withTrailingSlash(newPrefix)
  return `${toPrefix}${normalizedPath.slice(fromPrefix.length)}`
}

function stripSectionRoot(path: string): string {
  const segments = normalizePath(path).split('/').filter(Boolean)
  return segments.slice(1).join('/')
}

export function noteSidebarFolderRenamed(oldPath: string, newPath: string): void {
  pendingPathRemapEvent = {
    oldPath: normalizePath(oldPath),
    newPath: normalizePath(newPath),
  }
}

export function noteSidebarFolderMoved(oldPath: string, newPath: string): void {
  pendingPathRemapEvent = {
    oldPath: normalizePath(oldPath),
    newPath: normalizePath(newPath),
  }
}

export function consumeSidebarFolderPathRemapped(): SidebarFolderPathRemapEvent | null {
  const event = pendingPathRemapEvent
  pendingPathRemapEvent = null
  return event
}

export function remapExpandedFoldersForPathRemap(
  expandedFolders: string[],
  folderPaths: Set<string>,
  oldPath: string,
  newPath: string,
): string[] {
  const remappedProjectRelative = expandedFolders.map((path) => remapPrefix(path, oldPath, newPath))
  const didProjectRelativeRemap = remappedProjectRelative.some((path, index) => path !== normalizePath(expandedFolders[index]))
  if (didProjectRelativeRemap) {
    return remappedProjectRelative.filter((path) => folderPaths.has(path))
  }

  const oldScopedPath = stripSectionRoot(oldPath)
  const newScopedPath = stripSectionRoot(newPath)
  if (!oldScopedPath || !newScopedPath) {
    return remappedProjectRelative.filter((path) => folderPaths.has(path))
  }

  return expandedFolders
    .map((path) => remapPrefix(path, oldScopedPath, newScopedPath))
    .filter((path) => folderPaths.has(path))
}

export function remapExpandedFoldersForRename(
  expandedFolders: string[],
  folderPaths: Set<string>,
  oldPath: string,
  newPath: string,
): string[] {
  return remapExpandedFoldersForPathRemap(expandedFolders, folderPaths, oldPath, newPath)
}
