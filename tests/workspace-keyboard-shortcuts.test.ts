import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isFormFieldTarget,
  hasOpenModal,
  handleCommandShortcut,
  handleNavigationAndZoomShortcut,
} from '../src/features/project-editor/use-project-editor-shortcuts-effect'
import { MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL, ZOOM_STEP, clampZoomLevel } from '../src/features/project-editor/editor-zoom'

function makeParams(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    onToggleSplitLayout: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onToggleFocusMode: vi.fn(),
    onSwitchActivePane: vi.fn(),
    onSaveNow: vi.fn(),
    onOpenPreviousHistory: vi.fn(),
    onOpenNextHistory: vi.fn(),
    onEscapePressed: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomReset: vi.fn(),
    ...overrides,
  }
}

function makeKeyEvent(overrides: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, ...overrides })
}

describe('isFormFieldTarget', () => {
  it('returns true for input elements', () => {
    const input = document.createElement('input')
    expect(isFormFieldTarget(input)).toBe(true)
  })

  it('returns true for textarea elements', () => {
    const textarea = document.createElement('textarea')
    expect(isFormFieldTarget(textarea)).toBe(true)
  })

  it('returns true for select elements', () => {
    const select = document.createElement('select')
    expect(isFormFieldTarget(select)).toBe(true)
  })

  it('returns false for div elements', () => {
    const div = document.createElement('div')
    expect(isFormFieldTarget(div)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isFormFieldTarget(null)).toBe(false)
  })
})

describe('hasOpenModal', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-modal]').forEach(el => el.remove())
  })

  it('returns false when no aria-modal element exists', () => {
    expect(hasOpenModal()).toBe(false)
  })

  it('returns true when an aria-modal="true" element exists', () => {
    const div = document.createElement('div')
    div.setAttribute('aria-modal', 'true')
    document.body.appendChild(div)
    expect(hasOpenModal()).toBe(true)
  })

  it('returns false for aria-modal="false"', () => {
    const div = document.createElement('div')
    div.setAttribute('aria-modal', 'false')
    document.body.appendChild(div)
    expect(hasOpenModal()).toBe(false)
  })
})

describe('handleCommandShortcut', () => {
  it('Ctrl+Period calls onToggleSplitLayout and returns true', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ ctrlKey: true, code: 'Period' }), true)
    expect(result).toBe(true)
    expect(params.onToggleSplitLayout).toHaveBeenCalledOnce()
  })

  it('Cmd+Period (Mac) calls onToggleSplitLayout', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ metaKey: true, code: 'Period' }), true)
    expect(result).toBe(true)
    expect(params.onToggleSplitLayout).toHaveBeenCalledOnce()
  })

  it('Ctrl+Shift+F calls onToggleFullscreen and returns true', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ ctrlKey: true, shiftKey: true, code: 'KeyF' }), true)
    expect(result).toBe(true)
    expect(params.onToggleFullscreen).toHaveBeenCalledOnce()
  })

  it('Ctrl+Shift+M calls onToggleFocusMode and returns true', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ ctrlKey: true, shiftKey: true, code: 'KeyM' }), true)
    expect(result).toBe(true)
    expect(params.onToggleFocusMode).toHaveBeenCalledOnce()
  })

  it('Ctrl+Shift+Tab calls onSwitchActivePane and returns true', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ ctrlKey: true, shiftKey: true, code: 'Tab' }), true)
    expect(result).toBe(true)
    expect(params.onSwitchActivePane).toHaveBeenCalledOnce()
  })

  it('Ctrl+S calls onSaveNow and returns true', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ ctrlKey: true, code: 'KeyS' }), true)
    expect(result).toBe(true)
    expect(params.onSaveNow).toHaveBeenCalledOnce()
  })

  it('Ctrl+Alt+S returns false (altKey blocks save)', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ ctrlKey: true, altKey: true, code: 'KeyS' }), true)
    expect(result).toBe(false)
    expect(params.onSaveNow).not.toHaveBeenCalled()
  })

  it('Ctrl+Alt+Period returns false (altKey blocks split toggle)', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ ctrlKey: true, altKey: true, code: 'Period' }), true)
    expect(result).toBe(false)
    expect(params.onToggleSplitLayout).not.toHaveBeenCalled()
  })

  it('returns false for unrecognized key combo (Ctrl+X)', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ ctrlKey: true, code: 'KeyX' }), true)
    expect(result).toBe(false)
    Object.values(params).forEach(fn => expect(fn).not.toHaveBeenCalled())
  })

  it('returns false when isCommandKey is false', () => {
    const params = makeParams()
    const result = handleCommandShortcut(params, makeKeyEvent({ code: 'Period' }), false)
    expect(result).toBe(false)
    expect(params.onToggleSplitLayout).not.toHaveBeenCalled()
  })
})

describe('handleNavigationAndZoomShortcut', () => {
  it('Alt+ArrowLeft calls onOpenPreviousHistory and returns true', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ altKey: true, code: 'ArrowLeft' }), false)
    expect(result).toBe(true)
    expect(params.onOpenPreviousHistory).toHaveBeenCalledOnce()
  })

  it('Alt+ArrowRight calls onOpenNextHistory and returns true', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ altKey: true, code: 'ArrowRight' }), false)
    expect(result).toBe(true)
    expect(params.onOpenNextHistory).toHaveBeenCalledOnce()
  })

  it('returns false when isCommandKey blocks Alt+ArrowLeft', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ altKey: true, ctrlKey: true, code: 'ArrowLeft' }), true)
    expect(result).toBe(false)
    expect(params.onOpenPreviousHistory).not.toHaveBeenCalled()
  })

  it('returns false when shiftKey blocks Alt+ArrowLeft', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ altKey: true, shiftKey: true, code: 'ArrowLeft' }), false)
    expect(result).toBe(false)
    expect(params.onOpenPreviousHistory).not.toHaveBeenCalled()
  })

  it('Ctrl+Equal (code) calls onZoomIn and returns true', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ ctrlKey: true, code: 'Equal' }), true)
    expect(result).toBe(true)
    expect(params.onZoomIn).toHaveBeenCalledOnce()
  })

  it('Ctrl+key "+" (alternate keyboard) calls onZoomIn', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ ctrlKey: true, code: 'Equal', key: '+' }), true)
    expect(result).toBe(true)
    expect(params.onZoomIn).toHaveBeenCalledOnce()
  })

  it('Ctrl+Minus (code) calls onZoomOut and returns true', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ ctrlKey: true, code: 'Minus' }), true)
    expect(result).toBe(true)
    expect(params.onZoomOut).toHaveBeenCalledOnce()
  })

  it('Ctrl+key "-" (alternate keyboard) calls onZoomOut', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ ctrlKey: true, code: 'Minus', key: '-' }), true)
    expect(result).toBe(true)
    expect(params.onZoomOut).toHaveBeenCalledOnce()
  })

  it('Ctrl+key "0" calls onZoomReset and returns true', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ ctrlKey: true, key: '0' }), true)
    expect(result).toBe(true)
    expect(params.onZoomReset).toHaveBeenCalledOnce()
  })

  it('returns false when shiftKey blocks zoom (Ctrl+Shift+Equal)', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ ctrlKey: true, shiftKey: true, code: 'Equal' }), true)
    expect(result).toBe(false)
    expect(params.onZoomIn).not.toHaveBeenCalled()
  })

  it('returns false when altKey blocks zoom (Ctrl+Alt+Equal)', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ ctrlKey: true, altKey: true, code: 'Equal' }), true)
    expect(result).toBe(false)
    expect(params.onZoomIn).not.toHaveBeenCalled()
  })

  it('returns false for unrecognized combo', () => {
    const params = makeParams()
    const result = handleNavigationAndZoomShortcut(params, makeKeyEvent({ altKey: true, code: 'KeyX' }), false)
    expect(result).toBe(false)
    Object.values(params).forEach(fn => expect(fn).not.toHaveBeenCalled())
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
