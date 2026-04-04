import { describe, expect, it } from 'vitest'
import { filterSidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-filter-logic'
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

  it('filters tree by query and returns visible nodes plus auto-expanded folders', () => {
    const tree = buildSidebarTree([
      'Act-01/Chapter-01/Scene-001.md',
      'Act-01/Chapter-02/Scene-003.md',
      'Appendix/glossary.md',
    ])

    const result = filterSidebarTree(tree, 'scene-003')

    expect(result.matchedFilePaths).toEqual(['Act-01/Chapter-02/Scene-003.md'])
    expect(result.autoExpandFolderPaths).toEqual(['Act-01/Chapter-02', 'Act-01'])

    const rows = getVisibleSidebarRows(tree, new Set(result.autoExpandFolderPaths), result.visibleNodePaths)
    expect(rows.map((row) => row.path)).toEqual([
      'Act-01',
      'Act-01/Chapter-02',
      'Act-01/Chapter-02/Scene-003.md',
    ])
  })

  it('returns empty filter result for blank query', () => {
    const tree = buildSidebarTree(['a.md'])
    const result = filterSidebarTree(tree, '   ')

    expect(result.query).toBe('')
    expect(result.matchedFilePaths).toEqual([])
    expect(result.visibleNodePaths.size).toBe(0)
    expect(result.autoExpandFolderPaths).toEqual([])
  })
})
