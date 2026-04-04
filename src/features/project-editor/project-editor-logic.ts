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
