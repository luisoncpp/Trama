import { describe, expect, it, vi } from 'vitest'
import { h } from 'preact'
import { act } from 'preact/test-utils'
import { SidebarScopePathBreadcrumb } from '../src/features/project-editor/components/sidebar/sidebar-scope-path-breadcrumb.tsx'
import {
  buildEditorActionsSpies,
  renderWithEditorActions,
} from './helpers/editor-actions-test-helper.ts'

describe('SidebarScopePathBreadcrumb context menu', () => {
  it('opens menu on right click and runs select project', () => {
    const onPickFolder = vi.fn()
    const container = document.createElement('div')
    renderWithEditorActions(
      h(SidebarScopePathBreadcrumb, {
        projectRootPath: 'C:/Proyectos/trama/example-fantasy',
        disabled: false,
      }),
      { container, actions: buildEditorActionsSpies({ pickProjectFolder: onPickFolder }) },
    )

    const button = container.querySelector('.path-breadcrumb-trigger') as HTMLButtonElement
    act(() => {
      button.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 40, clientY: 50 }))
    })

    const menuItems = Array.from(container.querySelectorAll('.sidebar-context-menu__item')) as HTMLButtonElement[]
    expect(menuItems.map((item) => item.textContent?.trim())).toEqual([
      'Select project folder...',
      'Show in File Explorer',
      'Close project',
    ])
    expect(menuItems[1]?.disabled).toBe(false)
    expect(menuItems[2]?.disabled).toBe(false)

    act(() => {
      menuItems[0]?.click()
    })
    expect(onPickFolder).toHaveBeenCalledTimes(1)
  })

  it('disables project-only actions when no project is open', () => {
    const container = document.createElement('div')
    renderWithEditorActions(
      h(SidebarScopePathBreadcrumb, {
        projectRootPath: '',
        disabled: false,
      }),
      { container },
    )

    const button = container.querySelector('.path-breadcrumb-trigger') as HTMLButtonElement
    act(() => {
      button.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 20 }))
    })

    const menuItems = Array.from(container.querySelectorAll('.sidebar-context-menu__item')) as HTMLButtonElement[]
    expect(menuItems[0]?.disabled).toBe(false)
    expect(menuItems[1]?.disabled).toBe(true)
    expect(menuItems[2]?.disabled).toBe(true)
  })
})
