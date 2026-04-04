import type { ProjectSnapshot } from '../../shared/ipc'

export function resolvePreferredFile(snapshot: ProjectSnapshot, preferredFilePath?: string): string | undefined {
  if (preferredFilePath && snapshot.markdownFiles.includes(preferredFilePath)) {
    return preferredFilePath
  }

  return snapshot.markdownFiles[0]
}

export function canSelectFile(isDirty: boolean, selectedPath: string | null, nextPath: string): boolean {
  if (!isDirty || !selectedPath) {
    return true
  }

  return selectedPath === nextPath
}

export function shouldRefreshTreeOnExternalEvent(eventKind: 'add' | 'change' | 'unlink'): boolean {
  return eventKind === 'add' || eventKind === 'unlink'
}

export function buildConflictCopyPath(originalPath: string, existingPaths: string[]): string {
  const normalizedOriginal = originalPath.replace(/\\/g, '/')
  const existing = new Set(existingPaths.map((value) => value.replace(/\\/g, '/')))
  const extension = '.md'

  if (!normalizedOriginal.endsWith(extension)) {
    throw new Error('Only markdown files are supported for save-as-copy')
  }

  const withoutExtension = normalizedOriginal.slice(0, -extension.length)
  let attempt = `${withoutExtension}.conflict-copy${extension}`
  let sequence = 2

  while (existing.has(attempt)) {
    attempt = `${withoutExtension}.conflict-copy-${sequence}${extension}`
    sequence += 1
  }

  return attempt
}
