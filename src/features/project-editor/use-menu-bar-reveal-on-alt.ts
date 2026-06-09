import { useEffect } from 'preact/hooks'
import { isBareMenuBarAltKey } from '../../shared/menu-bar-alt-key'

/**
 * Win32 overlay title bars do not receive bare Alt in the main process; route through IPC instead.
 */
export function useMenuBarRevealOnAltEffect(): void {
  useEffect(/* handleMenuBarRevealOnAlt */ () => {
    let otherKeyPressed = false
    let isAltDown = false

    const onKeyDown = (event: KeyboardEvent) => {
      if (isBareMenuBarAltKey(event)) {
        isAltDown = true
        otherKeyPressed = false
        return
      }

      if (isAltDown) {
        otherKeyPressed = true
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt' || event.code === 'AltLeft') {
        isAltDown = false
        if (!otherKeyPressed) {
          void window.tramaApi?.revealMenuBar?.()
        }
      }
    }

    const onBlur = () => {
      isAltDown = false
      otherKeyPressed = false
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', onBlur)
    }
  }, [] /*Inputs for handleMenuBarRevealOnAlt — stable*/)
}
