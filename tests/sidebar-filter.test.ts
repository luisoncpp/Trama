import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { SidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-tree.tsx'

describe('sidebar filter UX', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('shows empty state message when filter has no matches', () => {
    act(() => {
      render(
        h(SidebarTree, {
          visibleFiles: ['Act-01/Chapter-01/Scene-001.md'],
          selectedPath: null,
          loadingDocument: false,
          onSelectFile: () => undefined,
          filterQuery: 'missing-file',
        }),
        container,
      )
    })

    expect(container.textContent).toContain('No files match "missing-file".')
  })

  it('restores previously expanded folders after clearing filter', () => {
    const props = {
      visibleFiles: [
        'Act-01/Chapter-01/Scene-001.md',
        'Act-01/Chapter-02/Scene-003.md',
      ],
      selectedPath: null,
      loadingDocument: false,
      onSelectFile: () => undefined,
      filterQuery: '',
    }

    act(() => {
      render(h(SidebarTree, props), container)
    })

    const chapter01Button = Array.from(container.querySelectorAll('.sidebar-tree__row')).find((node) =>
      node.textContent?.includes('Chapter-01'),
    ) as HTMLButtonElement

    act(() => {
      chapter01Button.click()
    })

    expect(container.textContent).toContain('Scene-001.md')

    act(() => {
      render(h(SidebarTree, { ...props, filterQuery: 'scene-003' }), container)
    })

    expect(container.textContent).toContain('Scene-003.md')
    expect(container.textContent).not.toContain('Scene-001.md')

    act(() => {
      render(h(SidebarTree, { ...props, filterQuery: '' }), container)
    })

    expect(container.textContent).toContain('Scene-001.md')
    expect(container.textContent).not.toContain('Scene-003.md')
  })
})
