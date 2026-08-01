import { describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { clampContextMenuPosition } from '../src/features/project-editor/components/sidebar/clamp-context-menu-position'
import { SidebarFileContextMenu } from '../src/features/project-editor/components/sidebar/sidebar-file-context-menu.tsx'

describe('clampContextMenuPosition', () => {
  it('keeps the preferred point when the menu fits', () => {
    expect(
      clampContextMenuPosition(
        { x: 40, y: 50 },
        { width: 160, height: 120 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ x: 40, y: 50 })
  })

  it('flips up and left when the preferred point would clip past the viewport', () => {
    expect(
      clampContextMenuPosition(
        { x: 760, y: 560 },
        { width: 160, height: 120 },
        { width: 800, height: 600 },
        8,
      ),
    ).toEqual({ x: 632, y: 472 })
  })

  it('never goes below the padding edge even for oversized menus', () => {
    expect(
      clampContextMenuPosition(
        { x: 10, y: 10 },
        { width: 900, height: 700 },
        { width: 800, height: 600 },
        8,
      ),
    ).toEqual({ x: 8, y: 8 })
  })
})

describe('SidebarFileContextMenu viewport clamp', () => {
  it('moves the menu up when opened near the bottom of the window', () => {
    const previousInnerWidth = window.innerWidth
    const previousInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 })

    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.classList?.contains('sidebar-context-menu')) {
        return {
          x: 20,
          y: 380,
          width: 180,
          height: 150,
          top: 380,
          left: 20,
          bottom: 530,
          right: 200,
          toJSON: () => ({}),
        }
      }
      return originalGetBoundingClientRect.call(this)
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    try {
      act(() => {
        render(
          h(SidebarFileContextMenu, {
            isOpen: true,
            position: { x: 20, y: 380 },
            onEditTags: vi.fn(),
            onRename: vi.fn(),
            onDelete: vi.fn(),
            onReveal: vi.fn(),
            onClose: vi.fn(),
          }),
          container,
        )
      })

      const menu = container.querySelector('.sidebar-context-menu') as HTMLDivElement
      expect(menu).toBeTruthy()
      expect(menu.style.top).toBe('242px')
      expect(menu.style.left).toBe('20px')
    } finally {
      render(null, container)
      container.remove()
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousInnerWidth })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: previousInnerHeight })
    }
  })
})