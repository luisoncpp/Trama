import type { DocumentMeta, ProjectSnapshot } from '../../../../shared/ipc'
import type { PaneDocumentState, WorkspaceLayoutState } from '../../project-editor-types'

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

export function deriveActivePaneDocument(
  workspaceLayout: WorkspaceLayoutState,
  primaryPane: PaneDocumentState,
  secondaryPane: PaneDocumentState,
): { selectedPath: string | null; editorValue: string; editorMeta: DocumentMeta; isDirty: boolean } {
  const activePane = workspaceLayout.activePane === 'secondary' ? secondaryPane : primaryPane
  const activePanePath = workspaceLayout.activePane === 'secondary'
    ? workspaceLayout.secondaryPath
    : workspaceLayout.primaryPath
  return {
    selectedPath: activePanePath,
    editorValue: activePane.content,
    editorMeta: activePane.meta,
    isDirty: activePane.isDirty,
  }
}
