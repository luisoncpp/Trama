import { useEffect } from 'preact/hooks'
import type { ProjectEditorModel } from './project-editor-types'

interface UseWorkspaceKeyboardShortcutsParams {
  model: ProjectEditorModel
}

/**
 * Global keyboard shortcuts for workspace operations:
 * - Ctrl/Cmd+Shift+P: Toggle split mode
 * - Ctrl/Cmd+Shift+Tab: Switch active pane (in split mode)
 * - Ctrl/Cmd+.: Alternative toggle split (from notes)
 */
export function useWorkspaceKeyboardShortcuts({ model }: UseWorkspaceKeyboardShortcutsParams): void {
  const { state, actions } = model

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const isModifierPressed = isMac ? event.metaKey : event.ctrlKey

      // Ctrl/Cmd+Shift+P: Toggle split mode
      if (isModifierPressed && event.shiftKey && event.key === 'P') {
        event.preventDefault()
        actions.toggleWorkspaceLayoutMode()
      }

      // Ctrl/Cmd+.: Alternative toggle split (mentioned in phase-3 plan)
      if (isModifierPressed && event.key === '.') {
        event.preventDefault()
        actions.toggleWorkspaceLayoutMode()
      }

      // Ctrl/Cmd+Shift+Tab: Switch active pane (when in split mode)
      if (isModifierPressed && event.shiftKey && event.key === 'Tab') {
        event.preventDefault()
        if (state.workspaceLayout.mode === 'split') {
          const nextPane = state.workspaceLayout.activePane === 'primary' ? 'secondary' : 'primary'
          actions.setWorkspaceActivePane(nextPane)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [state, actions])
}
