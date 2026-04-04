import { describe, expect, it } from 'vitest'
import { buildSidebarTree, getAncestorFolderPaths, getVisibleSidebarRows } from '../src/features/project-editor/components/sidebar/sidebar-tree-logic'

describe('sidebar tree logic', () => {
  it('builds hierarchical folders and files with folder-first sorting', () => {
    const tree = buildSidebarTree([
      'Lore/Places/city.md',
      'Lore/Characters/hero.md',
      'Manuscript/chapter-01.md',
      'README.md',
    ])

    expect(tree.rootIds).toEqual(['Lore', 'Manuscript', 'README.md'])
    expect(tree.nodesById['Lore'].childIds).toEqual(['Lore/Characters', 'Lore/Places'])
    expect(tree.nodesById['Lore/Characters'].childIds).toEqual(['Lore/Characters/hero.md'])
    expect(tree.nodesById['Lore/Places'].childIds).toEqual(['Lore/Places/city.md'])
  })

  it('returns visible rows based on expanded folders', () => {
    const tree = buildSidebarTree(['Lore/Characters/hero.md', 'Lore/Places/city.md'])

    const collapsedRows = getVisibleSidebarRows(tree, new Set())
    expect(collapsedRows.map((row) => row.path)).toEqual(['Lore'])

    const expandedRows = getVisibleSidebarRows(tree, new Set(['Lore', 'Lore/Characters']))
    expect(expandedRows.map((row) => row.path)).toEqual([
      'Lore',
      'Lore/Characters',
      'Lore/Characters/hero.md',
      'Lore/Places',
    ])
  })

  it('extracts ancestor folder paths from file path', () => {
    expect(getAncestorFolderPaths('Lore/Characters/hero.md')).toEqual(['Lore', 'Lore/Characters'])
    expect(getAncestorFolderPaths('root.md')).toEqual([])
  })
})
