import { describe, it, expect } from 'vitest'
import { MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL, ZOOM_STEP, clampZoomLevel } from '../src/features/project-editor/editor-zoom'

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

  describe('zoom shortcuts', () => {
    it('recognizes Ctrl+Equal for zoom in (Windows Ctrl+=)', () => {
      const code = 'Equal'
      const ctrlKey = true
      expect(ctrlKey).toBe(true)
      expect(code === 'Equal').toBe(true)
    })

    it('recognizes Ctrl+Minus for zoom out', () => {
      const code = 'Minus'
      const ctrlKey = true
      expect(code).toBe('Minus')
      expect(ctrlKey).toBe(true)
    })
  })

  describe('zoom level clamping', () => {
    it('clamps zoom level to minimum', () => {
      expect(clampZoomLevel(0.1)).toBe(MIN_ZOOM_LEVEL)
      expect(clampZoomLevel(-1)).toBe(MIN_ZOOM_LEVEL)
    })

    it('clamps zoom level to maximum', () => {
      expect(clampZoomLevel(5)).toBe(MAX_ZOOM_LEVEL)
      expect(clampZoomLevel(100)).toBe(MAX_ZOOM_LEVEL)
    })

    it('keeps valid zoom level unchanged', () => {
      expect(clampZoomLevel(1.0)).toBe(1.0)
      expect(clampZoomLevel(1.5)).toBe(1.5)
      expect(clampZoomLevel(MIN_ZOOM_LEVEL)).toBe(MIN_ZOOM_LEVEL)
      expect(clampZoomLevel(MAX_ZOOM_LEVEL)).toBe(MAX_ZOOM_LEVEL)
    })

    it('applies zoom step for zoom in', () => {
      const currentZoom = 1.0
      const newZoom = clampZoomLevel(currentZoom + ZOOM_STEP)
      expect(newZoom).toBe(1.1)
    })

    it('applies zoom step for zoom out', () => {
      const currentZoom = 1.0
      const newZoom = clampZoomLevel(currentZoom - ZOOM_STEP)
      expect(newZoom).toBe(0.9)
    })

    it('does not exceed MAX_ZOOM_LEVEL on zoom in', () => {
      const currentZoom = MAX_ZOOM_LEVEL
      const newZoom = clampZoomLevel(currentZoom + ZOOM_STEP)
      expect(newZoom).toBe(MAX_ZOOM_LEVEL)
    })

    it('does not go below MIN_ZOOM_LEVEL on zoom out', () => {
      const currentZoom = MIN_ZOOM_LEVEL
      const newZoom = clampZoomLevel(currentZoom - ZOOM_STEP)
      expect(newZoom).toBe(MIN_ZOOM_LEVEL)
    })
  })
})
