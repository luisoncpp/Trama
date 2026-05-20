import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { clampZoomLevel } from '../../editor-zoom'
import type { WorkspaceLayoutState, FocusScope } from '../../project-editor-types'

export async function setFullscreenEnabled(
  enabled: boolean,
  deps: {
    setIsFullscreen?: (value: boolean) => void
    setStatusMessage: (value: string) => void
  },
): Promise<void> {
  const response = await window.tramaApi.setFullscreen({ enabled })
  if (!response.ok) {
    deps.setStatusMessage(`Could not toggle fullscreen: ${response.error.message}`)
    return
  }

  if (deps.setIsFullscreen) {
    deps.setIsFullscreen(response.data.enabled)
  }
  deps.setStatusMessage(response.data.enabled ? 'Fullscreen enabled' : 'Fullscreen disabled')
}

export function toggleFocusMode(
  layout: WorkspaceLayoutState,
  setSidebarPanelCollapsed: (value: boolean) => void,
  setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void,
): void {
  if (!layout.focusModeEnabled) {
    setSidebarPanelCollapsed(true)
  }

  setWorkspaceLayout((previous) => ({
    ...previous,
    focusModeEnabled: !previous.focusModeEnabled,
  }))
}

export function setFocusScope(
  scope: FocusScope,
  setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void,
): void {
  setWorkspaceLayout((previous) => ({ ...previous, focusScope: scope }))
}

export function setZoomLevel(
  level: number,
  setWorkspaceLayout: (updater: (prev: WorkspaceLayoutState) => WorkspaceLayoutState) => void,
): void {
  setWorkspaceLayout((previous) => ({ ...previous, zoomLevel: clampZoomLevel(level) }))
}
