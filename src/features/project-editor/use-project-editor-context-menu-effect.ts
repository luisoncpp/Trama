import { useEffect } from 'preact/hooks'
import { WORKSPACE_CONTEXT_MENU_EVENT, type WorkspaceContextCommand } from '../../shared/workspace-context-menu'
import type { FocusScope } from './project-editor-types'

interface UseProjectEditorContextMenuEffectParams {
  isFullscreen: boolean
  gitAvailable: boolean
  toggleWorkspaceLayoutMode: () => void
  openPreviousInPaneHistory: () => Promise<void>
  openNextInPaneHistory: () => Promise<void>
  setFullscreenEnabled: (enabled: boolean) => Promise<void>
  toggleFocusMode: () => void
  setFocusScope: (scope: FocusScope) => void
  setWorkspaceLayoutRatio: (ratio: number) => void
  toggleDocumentRevisions: (path: string, pane?: 'primary' | 'secondary') => Promise<void>
}

function isFocusScope(value: unknown): value is FocusScope {
  return value === 'line' || value === 'sentence' || value === 'paragraph'
}

function clampRatio(value: number): number {
  return Math.min(0.8, Math.max(0.2, value))
}

function handleWorkspaceContextCommand(
  command: WorkspaceContextCommand,
  params: UseProjectEditorContextMenuEffectParams,
): void {
  switch (command.type) {
    case 'toggle-split':
      params.toggleWorkspaceLayoutMode()
      break
    case 'toggle-fullscreen':
      void params.setFullscreenEnabled(!params.isFullscreen)
      break
    case 'history-back':
      void params.openPreviousInPaneHistory()
      break
    case 'history-forward':
      void params.openNextInPaneHistory()
      break
    case 'toggle-focus':
      params.toggleFocusMode()
      break
    case 'set-focus-scope':
      if (isFocusScope(command.scope)) {
        params.setFocusScope(command.scope)
      }
      break
    case 'set-split-ratio':
      if (typeof command.ratio === 'number' && Number.isFinite(command.ratio)) {
        params.setWorkspaceLayoutRatio(clampRatio(command.ratio))
      }
      break
    case 'see-revisions':
      if (params.gitAvailable) {
        void params.toggleDocumentRevisions(command.path, command.pane)
      }
      break
    default:
      break
  }
}

export function useProjectEditorContextMenuEffect({
  isFullscreen,
  gitAvailable,
  toggleWorkspaceLayoutMode,
  openPreviousInPaneHistory,
  openNextInPaneHistory,
  setFullscreenEnabled,
  toggleFocusMode,
  setFocusScope,
  setWorkspaceLayoutRatio,
  toggleDocumentRevisions,
}: UseProjectEditorContextMenuEffectParams): void {
  useEffect(/* listenWorkspaceContextCommands */ () => {
    const onWorkspaceContextCommand = (event: Event) => {
      const customEvent = event as CustomEvent<WorkspaceContextCommand | undefined>
      const command = customEvent.detail
      if (!command || typeof command !== 'object' || !('type' in command)) {
        return
      }

      handleWorkspaceContextCommand(command, {
        isFullscreen,
        gitAvailable,
        toggleWorkspaceLayoutMode,
        openPreviousInPaneHistory,
        openNextInPaneHistory,
        setFullscreenEnabled,
        toggleFocusMode,
        setFocusScope,
        setWorkspaceLayoutRatio,
        toggleDocumentRevisions,
      })
    }

    window.addEventListener(WORKSPACE_CONTEXT_MENU_EVENT, onWorkspaceContextCommand as EventListener)
    return () => {
      window.removeEventListener(WORKSPACE_CONTEXT_MENU_EVENT, onWorkspaceContextCommand as EventListener)
    }
  }, [gitAvailable, isFullscreen, openNextInPaneHistory, openPreviousInPaneHistory, setFocusScope,
      setFullscreenEnabled, setWorkspaceLayoutRatio, toggleDocumentRevisions, toggleFocusMode,
      toggleWorkspaceLayoutMode] /*Inputs for listenWorkspaceContextCommands*/)
}
