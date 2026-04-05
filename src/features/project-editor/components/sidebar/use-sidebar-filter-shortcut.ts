import { useEffect } from 'preact/hooks'

interface UseSidebarFilterShortcutParams {
  enabled: boolean
  focusFilterInput: () => void
}

export function useSidebarFilterShortcut({ enabled, focusFilterInput }: UseSidebarFilterShortcutParams): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        focusFilterInput()
      }
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [enabled, focusFilterInput])
}
