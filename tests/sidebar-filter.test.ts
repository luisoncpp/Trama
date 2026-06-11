import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h, render } from 'preact'
import { useMemo, useState } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { SidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-tree.tsx'
import { buildSidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-tree-logic'
import { filterSidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-filter-logic'
import { useSidebarTreeExpandedFolders } from '../src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders'
import {
  buildEditorActionsSpies,
  renderWithEditorActions,
} from './helpers/editor-actions-test-helper.ts'

function TestTree(props: Omit<Parameters<typeof SidebarTree>[0], 'expandedFolders' | 'onToggleFolder'>) {
  const tree = useMemo(() => buildSidebarTree(props.visibleFiles), [props.visibleFiles])
  const filterResult = useMemo(() => filterSidebarTree(tree, props.filterQuery), [tree, props.filterQuery])
  const [setFolderExpanded, expandedFolders] = useSidebarTreeExpandedFolders(
    tree,
    props.selectedPath,
    props.filterQuery,
    filterResult.autoExpandFolderPaths,
  )
  return h(SidebarTree, {
    ...props,
    expandedFolders,
    onToggleFolder: setFolderExpanded,
  })
}

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
    const actions = buildEditorActionsSpies()
    act(() => {
      renderWithEditorActions(
        h(SidebarTree, {
          visibleFiles: ['Act-01/Chapter-01/Scene-001.md'],
          selectedPath: null,
          loadingDocument: false,
          filterQuery: 'missing-file',
          expandedFolders: [],
          onToggleFolder: () => {},
        }),
        { container, actions, scopeRoot: 'book/' },
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
      filterQuery: '',
    }

    act(() => {
      renderWithEditorActions(h(TestTree, props), { container, scopeRoot: 'book/' })
    })

    const chapter01Button = Array.from(container.querySelectorAll('.sidebar-tree__row')).find((node) =>
      node.textContent?.includes('Chapter-01'),
    ) as HTMLButtonElement

    act(() => {
      chapter01Button.click()
    })

    expect(container.textContent).toContain('Scene-001.md')

    act(() => {
      renderWithEditorActions(h(TestTree, { ...props, filterQuery: 'scene-003' }), { container, scopeRoot: 'book/' })
    })

    expect(container.textContent).toContain('Scene-003.md')
    expect(container.textContent).not.toContain('Scene-001.md')

    act(() => {
      renderWithEditorActions(h(TestTree, { ...props, filterQuery: '' }), { container, scopeRoot: 'book/' })
    })

    expect(container.textContent).toContain('Scene-001.md')
    expect(container.textContent).not.toContain('Scene-003.md')
  })

  it('allows collapsing all folders without auto-expanding them again', () => {
    const props = {
      visibleFiles: [
        'Act-01/Chapter-01/Scene-001.md',
        'Lore/People/Hero.md',
      ],
      selectedPath: null,
      loadingDocument: false,
      filterQuery: '',
    }

    act(() => {
      renderWithEditorActions(h(TestTree, props), { container, scopeRoot: 'book/' })
    })

    const rootButtons = Array.from(container.querySelectorAll('.sidebar-tree__row')).filter((node) =>
      node.textContent === 'Act-01' || node.textContent === 'Lore',
    ) as HTMLButtonElement[]

    expect(rootButtons.length).toBe(2)

    act(() => {
      rootButtons.forEach((button) => button.click())
    })

    expect(container.textContent).not.toContain('Chapter-01')
    expect(container.textContent).not.toContain('People')
    expect(container.textContent).toContain('Act-01')
    expect(container.textContent).toContain('Lore')
  })
})
