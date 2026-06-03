export type BareAltKeyEvent = {
  key: string
  code: string
  repeat: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

/** True when the user pressed bare Left Alt (menu bar), not Alt+another key. */
export function isBareMenuBarAltKey(event: BareAltKeyEvent): boolean {
  if (event.repeat || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false
  }

  if (event.code === 'AltRight') {
    return false
  }

  return event.key === 'Alt' || event.code === 'AltLeft'
}
