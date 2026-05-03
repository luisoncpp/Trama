import { useCallback } from 'preact/hooks'
import type { ProjectEditorActions, SidebarSection } from './project-editor-types'
import type { ProjectEditorSidebarState } from './project-editor-types'
import type { WorkspaceLayoutState } from './project-editor-types'

export function useSetSidebarSectionAction(
  setters: { setSidebarActiveSection: (value: SidebarSection) => void },
): ProjectEditorActions['setSidebarSection'] {
  return useCallback(
    (section: SidebarSection) => {
      setters.setSidebarActiveSection(section)
    },
    [setters],
  )
}

export function useToggleSidebarPanelCollapsedAction(
  layout: WorkspaceLayoutState,
  sidebarState: ProjectEditorSidebarState,
  setters: { setSidebarPanelCollapsed: (value: boolean) => void },
): ProjectEditorActions['toggleSidebarPanelCollapsed'] {
  return useCallback(/* toggleSidebarPanelCollapsedAction */ () => {
    if (layout.focusModeEnabled) {
      setters.setSidebarPanelCollapsed(true)
      return
    }

    setters.setSidebarPanelCollapsed(!sidebarState.sidebarPanelCollapsed)
  }, [setters, layout.focusModeEnabled, sidebarState.sidebarPanelCollapsed] /*Inputs for toggleSidebarPanelCollapsedAction*/)
}

export function useSetSidebarPanelWidthAction(
  setters: { setSidebarPanelWidth: (value: number) => void },
): ProjectEditorActions['setSidebarPanelWidth'] {
  return useCallback(
    (width: number) => {
      setters.setSidebarPanelWidth(width)
    },
    [setters],
  )
}
