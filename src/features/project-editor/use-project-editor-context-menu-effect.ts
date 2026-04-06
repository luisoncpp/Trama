import { useEffect } from 'preact/hooks'
import { WORKSPACE_CONTEXT_MENU_EVENT, type WorkspaceContextCommand } from '../../shared/workspace-context-menu'
import type { FocusScope } from './project-editor-types'

interface UseProjectEditorContextMenuEffectParams {
  isFullscreen: boolean
  toggleWorkspaceLayoutMode: () => void
  setFullscreenEnabled: (enabled: boolean) => Promise<void>
  toggleFocusMode: () => void
  setFocusScope: (scope: FocusScope) => void
  setWorkspaceLayoutRatio: (ratio: number) => void
}

function isFocusScope(value: unknown): value is FocusScope {
  return value === 'line' || value === 'sentence' || value === 'paragraph'
}

function clampRatio(value: number): number {
  return Math.min(0.8, Math.max(0.2, value))
}

export function useProjectEditorContextMenuEffect({
  isFullscreen,
  toggleWorkspaceLayoutMode,
  setFullscreenEnabled,
  toggleFocusMode,
  setFocusScope,
  setWorkspaceLayoutRatio,
}: UseProjectEditorContextMenuEffectParams): void {
  useEffect(() => {
    const onWorkspaceContextCommand = (event: Event) => {
      const customEvent = event as CustomEvent<WorkspaceContextCommand | undefined>
      const command = customEvent.detail
      if (!command || typeof command !== 'object' || !('type' in command)) {
        return
      }

      switch (command.type) {
        case 'toggle-split':
          toggleWorkspaceLayoutMode()
          break
        case 'toggle-fullscreen':
          void setFullscreenEnabled(!isFullscreen)
          break
        case 'toggle-focus':
          toggleFocusMode()
          break
        case 'set-focus-scope':
          if (isFocusScope(command.scope)) {
            setFocusScope(command.scope)
          }
          break
        case 'set-split-ratio':
          if (typeof command.ratio === 'number' && Number.isFinite(command.ratio)) {
            setWorkspaceLayoutRatio(clampRatio(command.ratio))
          }
          break
        default:
          break
      }
    }

    window.addEventListener(WORKSPACE_CONTEXT_MENU_EVENT, onWorkspaceContextCommand as EventListener)
    return () => {
      window.removeEventListener(WORKSPACE_CONTEXT_MENU_EVENT, onWorkspaceContextCommand as EventListener)
    }
  }, [isFullscreen, setFocusScope, setFullscreenEnabled, setWorkspaceLayoutRatio, toggleFocusMode, toggleWorkspaceLayoutMode])
}
