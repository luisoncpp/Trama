import { describe, expect, it, vi } from 'vitest'
import { h } from 'preact'
import { formatProjectRootBreadcrumbLabel } from '../src/features/project-editor/components/sidebar/sidebar-panel-logic'
import { SidebarScopePathBreadcrumb } from '../src/features/project-editor/components/sidebar/sidebar-scope-path-breadcrumb.tsx'
import {
  buildEditorActionsSpies,
  renderWithEditorActions,
} from './helpers/editor-actions-test-helper.ts'

describe('formatProjectRootBreadcrumbLabel', () => {
  it('normalizes project root paths for display', () => {
    expect(formatProjectRootBreadcrumbLabel('C:\\Proyectos\\trama\\example-fantasy\\')).toBe(
      'C:/Proyectos/trama/example-fantasy',
    )
    expect(formatProjectRootBreadcrumbLabel('C:/Proyectos/trama/example-fantasy')).toBe(
      'C:/Proyectos/trama/example-fantasy',
    )
  })
})

describe('SidebarScopePathBreadcrumb', () => {
  it('renders placeholder and calls onPickFolder when empty', () => {
    const onPickFolder = vi.fn()
    const container = document.createElement('div')
    renderWithEditorActions(
      h(SidebarScopePathBreadcrumb, {
        projectRootPath: '',
        disabled: false,
      }),
      {
        container,
        actions: buildEditorActionsSpies({ pickProjectFolder: onPickFolder }),
      },
    )

    expect(container.textContent).toContain('Select project folder...')
    container.querySelector('button')?.click()
    expect(onPickFolder).toHaveBeenCalledOnce()
  })

  it('renders full project root with tooltip and css ellipsis class', () => {
    const container = document.createElement('div')
    renderWithEditorActions(
      h(SidebarScopePathBreadcrumb, {
        projectRootPath: 'C:/Proyectos/trama/example-fantasy',
        disabled: false,
      }),
      { container },
    )

    const button = container.querySelector('button')
    const label = container.querySelector('.path-breadcrumb-trigger__label[dir="rtl"]')
    const labelText = container.querySelector('.path-breadcrumb-trigger__label-text[dir="ltr"]')
    expect(button?.textContent).toContain('example-fantasy')
    expect(button?.textContent).not.toContain('/book')
    expect(button?.getAttribute('title')).toBe('C:/Proyectos/trama/example-fantasy')
    expect(label).not.toBeNull()
    expect(labelText?.textContent).toBe('C:/Proyectos/trama/example-fantasy')
    expect(button?.classList.contains('path-breadcrumb-trigger--empty')).toBe(false)
  })
})
