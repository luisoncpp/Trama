import { useEffect } from 'preact/hooks'

interface UseProjectEditorShortcutsEffectParams {
  onToggleSplitLayout: () => void
  onToggleFullscreen: () => void
  onToggleFocusMode: () => void
  onSwitchActivePane: () => void
}

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export function useProjectEditorShortcutsEffect({
  onToggleSplitLayout,
  onToggleFullscreen,
  onToggleFocusMode,
  onSwitchActivePane,
}: UseProjectEditorShortcutsEffectParams): void {
  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (isFormFieldTarget(event.target)) {
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
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [onSwitchActivePane, onToggleFocusMode, onToggleFullscreen, onToggleSplitLayout])
}
