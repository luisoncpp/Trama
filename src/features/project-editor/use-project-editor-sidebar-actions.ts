import { useCallback } from 'preact/hooks'
import type { ProjectEditorActions, SidebarSection } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

export function useSetSidebarSectionAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['setSidebarSection'] {
  return useCallback(
    (section: SidebarSection) => {
      setters.setSidebarActiveSection(section)
    },
    [setters],
  )
}

export function useToggleSidebarPanelCollapsedAction(
  values: UseProjectEditorStateResult['values'],
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['toggleSidebarPanelCollapsed'] {
  return useCallback(() => {
    if (values.workspaceLayout.focusModeEnabled) {
      setters.setSidebarPanelCollapsed(true)
      return
    }

    setters.setSidebarPanelCollapsed(!values.sidebarPanelCollapsed)
  }, [setters, values.sidebarPanelCollapsed, values.workspaceLayout.focusModeEnabled])
}

export function useSetSidebarPanelWidthAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['setSidebarPanelWidth'] {
  return useCallback(
    (width: number) => {
      setters.setSidebarPanelWidth(width)
    },
    [setters],
  )
}
