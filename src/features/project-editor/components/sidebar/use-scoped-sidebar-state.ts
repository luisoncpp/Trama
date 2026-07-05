// @Architecture(descriptionShort="Hook combining useSidebarState() with the section root to expose section-relative")
import { useMemo } from 'preact/hooks'
import { useSidebarState } from './sidebar-state-context'
import { useSidebarSectionRoot } from './sidebar-section-scope-context'
import {
  getScopedFiles,
  getScopedSelectedPath,
  scopeCorkboardOrder,
  type SidebarSectionRoot,
} from './sidebar-path-scoping'

export interface ScopedSidebarState {
  visibleFiles: string[]
  selectedPath: string | null
  corkboardOrder: Record<string, string[]> | undefined
}

export function useScopedSidebarState(): ScopedSidebarState {
  const state = useSidebarState()
  const root = useSidebarSectionRoot() as SidebarSectionRoot

  return useMemo(/* buildScopedSidebarState */ () => ({
    visibleFiles: getScopedFiles(state.visibleFiles, root),
    selectedPath: getScopedSelectedPath(state.selectedPath, root),
    corkboardOrder: scopeCorkboardOrder(state.corkboardOrder, root),
  }), [state.visibleFiles, state.selectedPath, state.corkboardOrder, root] /*Inputs for buildScopedSidebarState*/)
}
