import { describe, expect, it } from 'vitest'
import { filterSidebarTree } from '../src/features/project-editor/components/sidebar/sidebar-filter-logic'
import { buildSidebarTree, getAncestorFolderPaths, getVisibleSidebarRows, sortTreeRowsByOrder } from '../src/features/project-editor/components/sidebar/sidebar-tree-logic'
import { scopeCorkboardOrder } from '../src/features/project-editor/components/sidebar/sidebar-panel-body.tsx'

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

  it('includes empty folders provided as folder paths', () => {
    const tree = buildSidebarTree(['Lore/Worldbuilding/'])

    expect(tree.rootIds).toEqual(['Lore'])
    expect(tree.nodesById['Lore'].childIds).toEqual(['Lore/Worldbuilding'])
    expect(tree.nodesById['Lore/Worldbuilding'].type).toBe('folder')

    const rows = getVisibleSidebarRows(tree, new Set(['Lore']))
    expect(rows.map((row) => row.path)).toEqual(['Lore', 'Lore/Worldbuilding'])
  })
})

describe('sortTreeRowsByOrder', () => {
  it('returns rows unchanged when corkboardOrder is empty', () => {
    const tree = buildSidebarTree(['a.md', 'b.md', 'c.md'])
    const rows = getVisibleSidebarRows(tree, new Set())
    const sorted = sortTreeRowsByOrder(rows, {})
    expect(sorted.map((r) => r.path)).toEqual(rows.map((r) => r.path))
  })

  it('sorts root-level files by corkboardOrder key ""', () => {
    const tree = buildSidebarTree(['scene-a.md', 'scene-b.md', 'scene-c.md'])
    const rows = getVisibleSidebarRows(tree, new Set())
    const sorted = sortTreeRowsByOrder(rows, { '': ['scene-c.md', 'scene-a.md', 'scene-b.md'] })
    expect(sorted.map((r) => r.path)).toEqual(['scene-c.md', 'scene-a.md', 'scene-b.md'])
  })

  it('sorts files inside a folder by corkboardOrder folder key', () => {
    const tree = buildSidebarTree(['Act-01/scene-a.md', 'Act-01/scene-b.md'])
    const rows = getVisibleSidebarRows(tree, new Set(['Act-01']))
    const sorted = sortTreeRowsByOrder(rows, { 'Act-01': ['scene-b.md', 'scene-a.md'] })
    expect(sorted.map((r) => r.path)).toEqual(['Act-01', 'Act-01/scene-b.md', 'Act-01/scene-a.md'])
  })

  it('places unlisted files after ordered files in alphabetical fallback', () => {
    const tree = buildSidebarTree(['Act-01/scene-a.md', 'Act-01/scene-b.md', 'Act-01/scene-c.md'])
    const rows = getVisibleSidebarRows(tree, new Set(['Act-01']))
    const sorted = sortTreeRowsByOrder(rows, { 'Act-01': ['scene-c.md'] })
    const paths = sorted.map((r) => r.path)
    expect(paths).toEqual(['Act-01', 'Act-01/scene-c.md', 'Act-01/scene-a.md', 'Act-01/scene-b.md'])
  })

  it('preserves folder rows before file rows within ordered groups', () => {
    const tree = buildSidebarTree(['Act-01/sub/', 'Act-01/scene-a.md', 'Act-01/scene-b.md'])
    const rows = getVisibleSidebarRows(tree, new Set(['Act-01']))
    const sorted = sortTreeRowsByOrder(rows, { 'Act-01': ['scene-b.md', 'scene-a.md'] })
    const paths = sorted.map((r) => r.path)
    expect(paths).toEqual(['Act-01', 'Act-01/sub', 'Act-01/scene-b.md', 'Act-01/scene-a.md'])
  })

  it('handles nested folder ordering independently', () => {
    const tree = buildSidebarTree([
      'Act-01/Ch-01/scene-1.md',
      'Act-01/Ch-01/scene-2.md',
      'Act-01/Ch-02/scene-3.md',
    ])
    const rows = getVisibleSidebarRows(tree, new Set(['Act-01', 'Act-01/Ch-01', 'Act-01/Ch-02']))
    const sorted = sortTreeRowsByOrder(rows, {
      'Act-01/Ch-01': ['scene-2.md', 'scene-1.md'],
    })
    const paths = sorted.map((r) => r.path)
    expect(paths).toEqual([
      'Act-01',
      'Act-01/Ch-01',
      'Act-01/Ch-01/scene-2.md',
      'Act-01/Ch-01/scene-1.md',
      'Act-01/Ch-02',
      'Act-01/Ch-02/scene-3.md',
    ])
  })

  it('reorders files at root level with empty string key', () => {
    const tree = buildSidebarTree(['c.md', 'a.md', 'b.md'])
    const rows = getVisibleSidebarRows(tree, new Set())
    const sorted = sortTreeRowsByOrder(rows, { '': ['b.md', 'c.md', 'a.md'] })
    expect(sorted.map((r) => r.path)).toEqual(['b.md', 'c.md', 'a.md'])
  })

  it('skips ordering for collapsed folders', () => {
    const tree = buildSidebarTree(['Act-01/scene-b.md', 'Act-01/scene-a.md'])
    const rows = getVisibleSidebarRows(tree, new Set())
    const sorted = sortTreeRowsByOrder(rows, { 'Act-01': ['scene-a.md', 'scene-b.md'] })
    expect(sorted.map((r) => r.path)).toEqual(['Act-01'])
  })
})

describe('scopeCorkboardOrder', () => {
  it('returns undefined for undefined input', () => {
    expect(scopeCorkboardOrder(undefined, 'book/')).toBeUndefined()
  })

  it('converts project-relative keys to section-relative keys', () => {
    const order = {
      'book': ['scene-b.md', 'scene-a.md'],
      'book/Act-01': ['scene-2.md', 'scene-1.md'],
    }
    const scoped = scopeCorkboardOrder(order, 'book/')
    expect(scoped).toBeDefined()
    expect(Object.keys(scoped!)).toEqual(['', 'Act-01'])
    expect(scoped!['']).toEqual(['scene-b.md', 'scene-a.md'])
    expect(scoped!['Act-01']).toEqual(['scene-2.md', 'scene-1.md'])
  })

  it('filters out keys outside the section', () => {
    const order = {
      'book': ['scene-b.md', 'scene-a.md'],
      'lore/places': ['city.md'],
    }
    const scoped = scopeCorkboardOrder(order, 'book/')
    expect(Object.keys(scoped!)).toEqual([''])
  })

  it('scopes file ids within each key', () => {
    const order = {
      'book/Act-01': ['book/Act-01/scene-2.md', 'book/Act-01/scene-1.md'],
    }
    const scoped = scopeCorkboardOrder(order, 'book/')
    expect(scoped!['Act-01']).toEqual(['scene-2.md', 'scene-1.md'])
  })

  it('handles root-level key with file ids that lack folder prefix', () => {
    const order = {
      'book': ['intro.md', 'ch-01.md'],
    }
    const scoped = scopeCorkboardOrder(order, 'book/')
    expect(scoped!['']).toEqual(['intro.md', 'ch-01.md'])
  })
})
