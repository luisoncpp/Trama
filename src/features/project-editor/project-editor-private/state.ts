import { useMemo } from 'preact/hooks'
import type { ProjectSnapshot } from '../../../shared/ipc'
import type { PaneBindings } from '../pane'
import type { WorkspaceLayoutState } from '../project-editor-types'
import { useProjectEditorCoreState } from '../use-project-editor-core-state'
import { useSidebarUiState } from '../use-sidebar-ui-state'
import { useWorkspaceLayoutState } from '../use-workspace-layout-state'
import {
  useProjectEditorBindings,
  useProjectEditorSubStates,
} from './state-builders'
import { useProjectEditorValues } from './state-values'

function getVisibleSidebarPaths(snapshot: ProjectSnapshot | null): string[] {
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

function useVisibleFiles(snapshot: ProjectSnapshot | null): string[] {
  return useMemo(
    /* deriveVisibleSidebarPaths */ () => getVisibleSidebarPaths(snapshot),
    [snapshot] /*Inputs for deriveVisibleSidebarPaths*/,
  )
}

function useCorkboardOrder(snapshot: ProjectSnapshot | null): Record<string, string[]> {
  return useMemo(
    /* deriveCorkboardOrder */ () => snapshot?.index?.corkboardOrder ?? {},
    [snapshot] /*Inputs for deriveCorkboardOrder*/,
  )
}

export function useProjectEditorState() {
  const coreState = useProjectEditorCoreState()
  const [workspaceLayout, setWorkspaceLayout] = useWorkspaceLayoutState()
  const sidebarUiState = useSidebarUiState()
  const apiAvailable = Boolean(window.tramaApi?.openProject)

  const visibleFiles = useVisibleFiles(coreState.snapshot)
  const corkboardOrder = useCorkboardOrder(coreState.snapshot)
  const { documentState, layoutState, sidebarState, projectState, uiState } = useProjectEditorSubStates(
    coreState,
    workspaceLayout,
    sidebarUiState,
    apiAvailable,
    visibleFiles,
    corkboardOrder,
  )
  const { setters, paneBindings } = useProjectEditorBindings(
    coreState,
    sidebarUiState,
    setWorkspaceLayout,
  )
  const values = useProjectEditorValues(
    coreState,
    sidebarUiState,
    workspaceLayout,
    documentState,
    apiAvailable,
    visibleFiles,
    corkboardOrder,
  )

  return { values, documentState, layoutState, sidebarState, projectState, uiState, setters, paneBindings }
}
