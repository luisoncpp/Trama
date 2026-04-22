import type { UseProjectEditorStateResult } from './use-project-editor-state'
import type { WorkspaceLayoutState } from './project-editor-types'

function normalizeFolderPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function toFolderPrefix(folderPath: string): string {
  return `${normalizeFolderPath(folderPath)}/`
}

export function isPathInsideFolder(path: string | null, folderPath: string): boolean {
  if (!path) {
    return false
  }

  const normalizedPath = path.replaceAll('\\', '/').replace(/^\/+/, '')
  return normalizedPath.startsWith(toFolderPrefix(folderPath))
}

export function remapFolderPrefix(path: string | null, oldFolderPath: string, newFolderPath: string): string | null {
  if (!path) {
    return null
  }

  const oldPrefix = toFolderPrefix(oldFolderPath)
  const normalizedPath = path.replaceAll('\\', '/').replace(/^\/+/, '')
  if (!normalizedPath.startsWith(oldPrefix)) {
    return normalizedPath
  }

  const newPrefix = toFolderPrefix(newFolderPath)
  return `${newPrefix}${normalizedPath.slice(oldPrefix.length)}`
}

export function remapWorkspaceLayoutPathsForFolderRename(
  layout: WorkspaceLayoutState,
  oldFolderPath: string,
  newFolderPath: string,
): WorkspaceLayoutState {
  return {
    ...layout,
    primaryPath: remapFolderPrefix(layout.primaryPath, oldFolderPath, newFolderPath),
    secondaryPath: remapFolderPrefix(layout.secondaryPath, oldFolderPath, newFolderPath),
  }
}

function clearPathIfInsideFolder(path: string | null, folderPath: string): string | null {
  if (!path) {
    return null
  }

  return isPathInsideFolder(path, folderPath) ? null : path
}

export function pruneWorkspaceLayoutPathsForFolderDelete(
  layout: WorkspaceLayoutState,
  folderPath: string,
): WorkspaceLayoutState {
  return {
    ...layout,
    primaryPath: clearPathIfInsideFolder(layout.primaryPath, folderPath),
    secondaryPath: clearPathIfInsideFolder(layout.secondaryPath, folderPath),
  }
}

export function hasDirtyPathInsideFolder(values: UseProjectEditorStateResult['values'], folderPath: string): boolean {
  const primaryDirtyInFolder = values.primaryPane.isDirty && isPathInsideFolder(values.primaryPane.path, folderPath)
  const secondaryDirtyInFolder = values.secondaryPane.isDirty && isPathInsideFolder(values.secondaryPane.path, folderPath)
  return primaryDirtyInFolder || secondaryDirtyInFolder
}
