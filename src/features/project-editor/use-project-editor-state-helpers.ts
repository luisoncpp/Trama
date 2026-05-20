import type { ProjectEditorStateValues, SidebarSection, WorkspaceLayoutState } from './project-editor-types'
import type { ProjectSnapshot } from '../../shared/ipc'

export function getVisibleSidebarPaths(snapshot: ProjectSnapshot | null): string[] {
  if (!snapshot) return []
  const paths: string[] = []
  const collect = (items: ProjectSnapshot['tree']) => {
    for (const item of items) {
      if (item.type === 'folder') {
        paths.push(`${item.path}/`)
        collect(item.children ?? [])
        continue
      }
      paths.push(item.path)
    }
  }
  collect(snapshot.tree)
  return paths
}

export function buildValues(
  apiAvailable: boolean,
  rootPath: string,
  snapshot: ProjectSnapshot | null,
  primaryPane: import('./project-editor-types').PaneDocumentState,
  secondaryPane: import('./project-editor-types').PaneDocumentState,
  selectedPath: string | null,
  editorValue: string,
  editorMeta: Record<string, unknown>,
  isDirty: boolean,
  loadingProject: boolean,
  loadingDocument: boolean,
  saving: boolean,
  isFullscreen: boolean,
  externalConflictPath: string | null,
  conflictComparisonContent: string | null,
  statusMessage: string,
  visibleFiles: string[],
  corkboardOrder: Record<string, string[]>,
  sidebarActiveSection: SidebarSection,
  sidebarPanelCollapsed: boolean,
  sidebarPanelWidth: number,
  workspaceLayout: WorkspaceLayoutState,
): ProjectEditorStateValues {
  return {
    apiAvailable,
    rootPath,
    snapshot,
    primaryPane,
    secondaryPane,
    selectedPath,
    editorValue,
    editorMeta,
    isDirty,
    loadingProject,
    loadingDocument,
    saving,
    isFullscreen,
    externalConflictPath,
    conflictComparisonContent,
    statusMessage,
    visibleFiles,
    corkboardOrder,
    sidebarActiveSection,
    sidebarPanelCollapsed,
    sidebarPanelWidth,
    workspaceLayout,
  }
}
