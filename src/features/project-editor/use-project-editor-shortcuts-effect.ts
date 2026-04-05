import { useEffect } from 'preact/hooks'

interface UseProjectEditorShortcutsEffectParams {
  onToggleSplitLayout: () => void
}

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export function useProjectEditorShortcutsEffect({ onToggleSplitLayout }: UseProjectEditorShortcutsEffectParams): void {
  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (isFormFieldTarget(event.target)) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === 'Period') {
        event.preventDefault()
        onToggleSplitLayout()
      }
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [onToggleSplitLayout])
}
