import { describe, expect, it } from 'vitest'
import { isBareMenuBarAltKey, type BareAltKeyEvent } from '../src/shared/menu-bar-alt-key'

function altEvent(overrides: Partial<BareAltKeyEvent> = {}): BareAltKeyEvent {
  return {
    key: 'Alt',
    code: 'AltLeft',
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  }
}

describe('isBareMenuBarAltKey', () => {
  it('returns true for Left Alt key down', () => {
    expect(isBareMenuBarAltKey(altEvent())).toBe(true)
    expect(isBareMenuBarAltKey(altEvent({ key: 'Alt', code: 'AltLeft' }))).toBe(true)
  })

  it('returns false for repeats, modifiers, and other keys', () => {
    expect(isBareMenuBarAltKey(altEvent({ repeat: true }))).toBe(false)
    expect(isBareMenuBarAltKey(altEvent({ ctrlKey: true }))).toBe(false)
    expect(isBareMenuBarAltKey(altEvent({ key: 'ArrowLeft', code: 'ArrowLeft' }))).toBe(false)
    expect(isBareMenuBarAltKey(altEvent({ code: 'AltRight' }))).toBe(false)
  })
})
