import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h } from 'preact'
import { useMemo } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { SidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-tree.tsx'
import { buildSidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-tree-logic'
import { filterSidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-filter-logic'
import { useSidebarTreeExpandedFolders } from '../src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders'
import { getScopedFiles, getScopedSelectedPath, defineSidebarSectionRoot } from '../src/features/project-editor/components/sidebar/sidebar-path-scoping'
import {
  renderWithEditorActions,
} from './helpers/editor-actions-test-helper.ts'

const BOOK_ROOT = defineSidebarSectionRoot('book/')

interface TestTreeProps {
  visibleFiles: string[]
  selectedPath: string | null
  filterQuery: string
}

function TestTree(props: TestTreeProps) {
  const scopedFiles = getScopedFiles(props.visibleFiles, BOOK_ROOT)
  const scopedSelectedPath = getScopedSelectedPath(props.selectedPath, BOOK_ROOT)
  const tree = useMemo(() => buildSidebarTree(scopedFiles), [props.visibleFiles])
  const filterResult = useMemo(() => filterSidebarTree(tree, props.filterQuery), [tree, props.filterQuery])
  const [setFolderExpanded, expandedFolders] = useSidebarTreeExpandedFolders(
    tree,
    scopedSelectedPath,
    props.filterQuery,
    filterResult.autoExpandFolderPaths,
  )
  return h(SidebarTree, {
    filterQuery: props.filterQuery,
    expandedFolders,
    onToggleFolder: setFolderExpanded,
  })
}

function renderTestTree(container: HTMLElement, props: TestTreeProps) {
  renderWithEditorActions(h(TestTree, props), {
    container,
    scopeRoot: 'book/',
    sidebarState: { visibleFiles: props.visibleFiles, selectedPath: props.selectedPath },
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
    act(() => {
      renderTestTree(container, {
        visibleFiles: ['book/Act-01/Chapter-01/Scene-001.md'],
        selectedPath: null,
        filterQuery: 'missing-file',
      })
    })

    expect(container.textContent).toContain('No files match "missing-file".')
  })

  it('restores previously expanded folders after clearing filter', () => {
    const props: TestTreeProps = {
      visibleFiles: [
        'book/Act-01/Chapter-01/Scene-001.md',
        'book/Act-01/Chapter-02/Scene-003.md',
      ],
      selectedPath: null,
      filterQuery: '',
    }

    act(() => {
      renderTestTree(container, props)
    })

    const chapter01Button = Array.from(container.querySelectorAll('.sidebar-tree__row')).find((node) =>
      node.textContent?.includes('Chapter-01'),
    ) as HTMLButtonElement

    act(() => {
      chapter01Button.click()
    })

    expect(container.textContent).toContain('Scene-001.md')

    act(() => {
      renderTestTree(container, { ...props, filterQuery: 'scene-003' })
    })

    expect(container.textContent).toContain('Scene-003.md')
    expect(container.textContent).not.toContain('Scene-001.md')

    act(() => {
      renderTestTree(container, { ...props, filterQuery: '' })
    })

    expect(container.textContent).toContain('Scene-001.md')
    expect(container.textContent).not.toContain('Scene-003.md')
  })

  it('allows collapsing all folders without auto-expanding them again', () => {
    const props: TestTreeProps = {
      visibleFiles: [
        'book/Act-01/Chapter-01/Scene-001.md',
        'book/Lore/People/Hero.md',
      ],
      selectedPath: null,
      filterQuery: '',
    }

    act(() => {
      renderTestTree(container, props)
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
