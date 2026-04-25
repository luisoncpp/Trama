import { useEffect } from 'preact/hooks'

interface UseProjectEditorShortcutsEffectParams {
  onToggleSplitLayout: () => void
  onToggleFullscreen: () => void
  onToggleFocusMode: () => void
  onSwitchActivePane: () => void
  onSaveNow: () => void
  onEscapePressed: () => void
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
}: UseProjectEditorShortcutsEffectParams): void {
  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (isFormFieldTarget(event.target)) {
        return
      }

      if (event.key === 'Escape' && !hasOpenModal()) {
        event.preventDefault()
        onEscapePressed()
        return
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === 'Period') {
        event.preventDefault()
        onToggleSplitLayout()
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyF') {
        event.preventDefault()
        onToggleFullscreen()
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyM') {
        event.preventDefault()
        onToggleFocusMode()
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'Tab') {
        event.preventDefault()
        onSwitchActivePane()
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === 'KeyS') {
        event.preventDefault()
        onSaveNow()
      }
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [onSaveNow, onSwitchActivePane, onToggleFocusMode, onToggleFullscreen, onToggleSplitLayout, onEscapePressed])
}
