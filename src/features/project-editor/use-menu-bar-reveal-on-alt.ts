import { useEffect } from 'preact/hooks'
import { isBareMenuBarAltKey } from '../../shared/menu-bar-alt-key'

/**
 * Win32 overlay title bars do not receive bare Alt in the main process; route through IPC instead.
 */
export function useMenuBarRevealOnAltEffect(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isBareMenuBarAltKey(event)) {
        return
      }

      void window.tramaApi?.revealMenuBar?.()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])
}
