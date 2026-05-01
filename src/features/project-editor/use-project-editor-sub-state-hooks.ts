import { useMemo } from 'preact/hooks'
import type { PaneDocumentState, WorkspaceLayoutState } from './project-editor-types'
import type { SidebarUiStateValues } from './use-sidebar-ui-state'
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

export function useDocumentState(
  ws: WorkspaceLayoutState,
  primaryPane: PaneDocumentState,
  secondaryPane: PaneDocumentState,
) {
  return useMemo(() => {
    const activePane = ws.activePane === 'secondary' ? secondaryPane : primaryPane
    const activePanePath = ws.activePane === 'secondary' ? ws.secondaryPath : ws.primaryPath
    return {
      selectedPath: activePanePath,
      editorValue: activePane.content,
      editorMeta: activePane.meta,
      isDirty: activePane.isDirty,
    }
  }, [ws.activePane, ws.secondaryPath, ws.primaryPath, primaryPane, secondaryPane])
}

export function usePaneState(p: PaneDocumentState, s: PaneDocumentState) {
  return useMemo(() => ({ primaryPane: p, secondaryPane: s }), [p, s])
}

export function useLayoutState(ws: WorkspaceLayoutState) {
  return useMemo(() => ({ workspaceLayout: ws }), [ws])
}

export function useSidebarSt(ui: SidebarUiStateValues, ws: WorkspaceLayoutState) {
  return useMemo(() => ({
    sidebarActiveSection: ui.activeSection,
    sidebarPanelCollapsed: ui.panelCollapsed,
    sidebarPanelWidth: ui.panelWidth,
    focusModeEnabled: ws.focusModeEnabled,
  }), [ui.activeSection, ui.panelCollapsed, ui.panelWidth, ws.focusModeEnabled])
}

export function useProjectSt(
  rootPath: string,
  snap: Parameters<typeof getVisibleSidebarPaths>[0],
  vf: string[],
  co: Record<string, string[]>,
) {
  return useMemo(() => ({ rootPath, snapshot: snap, visibleFiles: vf, corkboardOrder: co }),
    [rootPath, snap, vf, co])
}

export function useUiSt(
  api: boolean,
  lp: boolean,
  ld: boolean,
  sv: boolean,
  isf: boolean,
  ecp: string | null,
  ccc: string | null,
  sm: string,
) {
  return useMemo(() => ({
    apiAvailable: api,
    loadingProject: lp,
    loadingDocument: ld,
    saving: sv,
    isFullscreen: isf,
    externalConflictPath: ecp,
    conflictComparisonContent: ccc,
    statusMessage: sm,
  }), [api, lp, ld, sv, isf, ecp, ccc, sm])
}