import { useCallback } from 'preact/hooks'
import type { ProjectEditorActions, ProjectEditorLayoutState, ProjectEditorSidebarState } from './project-editor-types'
import type { FocusScope } from './project-editor-types'

import type { WorkspaceLayoutState } from './project-editor-types'

export function useSetFullscreenEnabledAction(
  setters: { setStatusMessage: (value: string) => void; setIsFullscreen?: (value: boolean) => void },
): ProjectEditorActions['setFullscreenEnabled'] {
  return useCallback(/* setFullscreenEnabledAction */ async (enabled: boolean) => {
      const response = await window.tramaApi.setFullscreen({ enabled })
      if (!response.ok) {
        setters.setStatusMessage(`Could not toggle fullscreen: ${response.error.message}`)
        return
      }

      if (setters.setIsFullscreen) {
        setters.setIsFullscreen(response.data.enabled)
      }
      setters.setStatusMessage(response.data.enabled ? 'Fullscreen enabled' : 'Fullscreen disabled')
    },
    [setters] /*Inputs for setFullscreenEnabledAction*/)
}

export function useToggleFocusModeAction(
  layoutState: ProjectEditorLayoutState,
  sidebarState: ProjectEditorSidebarState,
  setters: { setSidebarPanelCollapsed: (value: boolean) => void; setWorkspaceLayout: (value: any) => void },
): ProjectEditorActions['toggleFocusMode'] {
  return useCallback(/* toggleFocusModeAction */ () => {
    if (!layoutState.workspaceLayout.focusModeEnabled) {
      setters.setSidebarPanelCollapsed(true)
    }

    setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
      ...previous,
      focusModeEnabled: !previous.focusModeEnabled,
    }))
  }, [setters, layoutState.workspaceLayout.focusModeEnabled] /*Inputs for toggleFocusModeAction*/)
}

export function useSetFocusScopeAction(
  setters: { setWorkspaceLayout: (value: any) => void },
): ProjectEditorActions['setFocusScope'] {
  return useCallback(/* setFocusScopeAction */ (scope: FocusScope) => {
      setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
        ...previous,
        focusScope: scope,
      }))
    },
    [setters] /*Inputs for setFocusScopeAction*/)
}
