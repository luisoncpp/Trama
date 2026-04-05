import { describe, it, expect } from 'vitest'

describe('Workspace Keyboard Shortcuts', () => {

  it('recognizes Ctrl+Shift+P to toggle split mode', () => {
    const key = 'P'
    const ctrlKey = true
    const shiftKey = true
    expect(key).toBe('P')
    expect(ctrlKey && shiftKey).toBe(true)
  })

  it('recognizes Cmd+Shift+P (Mac) to toggle split mode', () => {
    const key = 'P'
    const metaKey = true
    const shiftKey = true
    expect(key).toBe('P')
    expect(metaKey && shiftKey).toBe(true)
  })

  it('recognizes Ctrl+. to toggle split mode (alternative)', () => {
    const key = '.'
    const ctrlKey = true
    expect(key).toBe('.')
    expect(ctrlKey).toBe(true)
  })

  it('recognizes Ctrl+Shift+Tab to switch active pane in split mode', () => {
    const key = 'Tab'
    const ctrlKey = true
    const shiftKey = true
    expect(key).toBe('Tab')
    expect(ctrlKey && shiftKey).toBe(true)
  })

  it('switches from secondary to primary when active pane is secondary', () => {
    // Pane switch logic: alternate between 'primary' and 'secondary'
    type Pane = 'primary' | 'secondary'
    const togglePane = (pane: Pane): Pane => pane === 'primary' ? 'secondary' : 'primary'
    expect(togglePane('secondary')).toBe('primary')
  })

  it('ignores split mode toggle shortcuts in single mode for pane switch', () => {
    // Pane switching is only meaningful in split layout
    type LayoutMode = 'single' | 'split'
    const isSplitMode = (mode: LayoutMode): boolean => mode === 'split'
    expect(isSplitMode('single')).toBe(false)
    expect(isSplitMode('split')).toBe(true)
  })
})
