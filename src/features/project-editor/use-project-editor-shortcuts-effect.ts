import { useEffect } from 'preact/hooks'

interface UseProjectEditorShortcutsEffectParams {
  onToggleSplitLayout: () => void
  onToggleFullscreen: () => void
  onToggleFocusMode: () => void
  onSwitchActivePane: () => void
  onSaveNow: () => void
  onEscapePressed: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

function hasOpenModal(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null
}

export function useProjectEditorShortcutsEffect({
  onToggleSplitLayout,
  onToggleFullscreen,
  onToggleFocusMode,
  onSwitchActivePane,
  onSaveNow,
  onEscapePressed,
  onZoomIn,
  onZoomOut,
  onZoomReset
}: UseProjectEditorShortcutsEffectParams): void {
  useEffect(/* registerWorkspaceShortcuts */ () => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      
      if (isFormFieldTarget(event.target)) {
        return
      }

      if (event.key === 'Escape' && !hasOpenModal()) {
        event.preventDefault()
        onEscapePressed()
        return
      }
      const isCommandKey = (event.ctrlKey || event.metaKey);

      if (isCommandKey && !event.altKey && event.code === 'Period') {
        event.preventDefault()
        onToggleSplitLayout()
      }

      if (isCommandKey && event.shiftKey && event.code === 'KeyF') {
        event.preventDefault()
        onToggleFullscreen()
      }

      if (isCommandKey && event.shiftKey && event.code === 'KeyM') {
        event.preventDefault()
        onToggleFocusMode()
      }

      if (isCommandKey && event.shiftKey && event.code === 'Tab') {
        event.preventDefault()
        onSwitchActivePane()
      }

      if (isCommandKey && !event.altKey && !event.shiftKey && event.code === 'KeyS') {
        event.preventDefault()
        onSaveNow()
        return
      }

      // Ctrl/Cmd++: Zoom in (English: Ctrl+=, Spanish: Ctrl++ tecla propia)
      if (isCommandKey && !event.altKey && !event.shiftKey && (event.code === 'Equal' || event.key === '+')) {
        event.preventDefault()
        onZoomIn()
        return
      }

      // Ctrl/Cmd+-: Zoom out
      if (isCommandKey && !event.altKey && !event.shiftKey && (event.code === 'Minus' || event.key === '-')) {
        event.preventDefault()
        onZoomOut()
        return
      }

      if (isCommandKey && !event.altKey && !event.shiftKey && event.key == '0') {
        event.preventDefault()
        onZoomReset();
        return
      }      

    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [onSaveNow, onSwitchActivePane, onToggleFocusMode, onToggleFullscreen, onToggleSplitLayout, onEscapePressed, onZoomIn, onZoomOut] /*Inputs for registerWorkspaceShortcuts*/)
}
