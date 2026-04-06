import { useCallback } from 'preact/hooks'
import type { ProjectEditorActions } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'
import type { FocusScope } from './project-editor-types'

export function useSetFullscreenEnabledAction(
  setters: UseProjectEditorStateResult['setters'],
): ProjectEditorActions['setFullscreenEnabled'] {
  return useCallback(
    async (enabled: boolean) => {
      const response = await window.tramaApi.setFullscreen({ enabled })
      if (!response.ok) {
        setters.setStatusMessage(`Could not toggle fullscreen: ${response.error.message}`)
        return
      }

      setters.setIsFullscreen(response.data.enabled)
      setters.setStatusMessage(response.data.enabled ? 'Fullscreen enabled' : 'Fullscreen disabled')
    },
    [setters],
  )
}

export function useToggleFocusModeAction(setters: UseProjectEditorStateResult['setters']): ProjectEditorActions['toggleFocusMode'] {
  return useCallback(() => {
    setters.setWorkspaceLayout((previous) => ({
      ...previous,
      focusModeEnabled: !previous.focusModeEnabled,
    }))
  }, [setters])
}

export function useSetFocusScopeAction(setters: UseProjectEditorStateResult['setters']): ProjectEditorActions['setFocusScope'] {
  return useCallback(
    (scope: FocusScope) => {
      setters.setWorkspaceLayout((previous) => ({
        ...previous,
        focusScope: scope,
      }))
    },
    [setters],
  )
}
