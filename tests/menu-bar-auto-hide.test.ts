import { describe, expect, it } from 'vitest'
import { shouldRevealMenuBarOnAlt } from '../electron/main-process/menu-bar-auto-hide.js'

function altInput(overrides: Partial<Electron.Input> = {}): Electron.Input {
  return {
    type: 'keyDown',
    key: 'Alt',
    code: 'AltLeft',
    isAutoRepeat: false,
    ...overrides,
  } as Electron.Input
}

describe('shouldRevealMenuBarOnAlt', () => {
  it('returns true for a bare Alt key down', () => {
    expect(shouldRevealMenuBarOnAlt(altInput())).toBe(true)
    expect(shouldRevealMenuBarOnAlt(altInput({ key: 'Process', code: 'AltLeft' }))).toBe(true)
  })

  it('returns false for key up, repeats, and non-Alt keys', () => {
    expect(shouldRevealMenuBarOnAlt(altInput({ type: 'keyUp' }))).toBe(false)
    expect(shouldRevealMenuBarOnAlt(altInput({ isAutoRepeat: true }))).toBe(false)
    expect(shouldRevealMenuBarOnAlt(altInput({ key: 'a', code: 'KeyA' }))).toBe(false)
  })

  it('returns false for right Alt on Windows', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32' })
    expect(shouldRevealMenuBarOnAlt(altInput({ code: 'AltRight' }))).toBe(false)
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })
})
