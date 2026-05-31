import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { createRef } from 'preact'
import { SidebarResizeHandle } from '../src/features/project-editor/layout/sidebar-resize-handle'

describe('SidebarResizeHandle', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('updates sidebar width while dragging the handle', () => {
    const workspaceRef = createRef<HTMLElement>()
    const onWidthChange = vi.fn()

    act(() => {
      render(
        h('section', { class: 'editor-workspace', ref: workspaceRef, style: { width: '900px' } },
          h(SidebarResizeHandle, { workspaceRef, onWidthChange }),
        ),
        container,
      )
    })

    const handle = container.querySelector('.sidebar-resize-handle') as HTMLDivElement
    expect(handle).toBeTruthy()

    act(() => {
      handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 410 }))
    })

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 430 }))
    })

    expect(onWidthChange).toHaveBeenCalled()
    expect(onWidthChange.mock.calls.at(-1)?.[0]).toBeGreaterThanOrEqual(260)
    expect(onWidthChange.mock.calls.at(-1)?.[0]).toBeLessThanOrEqual(460)

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })
})
