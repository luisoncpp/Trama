import { describe, expect, it } from 'vitest'
import { buildSidebarTree, getVisibleSidebarRows, sortTreeRowsByOrder } from '../src/features/project-editor/components/sidebar/sidebar-tree-logic'
import { scopeCorkboardOrder } from '../src/features/project-editor/components/sidebar/sidebar-panel-body'

describe('corkboardOrder integration', () => {
  describe('scopeCorkboardOrder: project-relative → section-relative conversion', () => {
    it('converts book/ root key to empty string for book/ section root', () => {
      const order = { 'book': ['scene-b.md', 'scene-a.md'] }
      const scoped = scopeCorkboardOrder(order, 'book/')
      expect(scoped!['']).toEqual(['scene-b.md', 'scene-a.md'])
    })

    it('converts nested keys by stripping the section root prefix', () => {
      const order = {
        'outline': ['intro.md', 'chapter-1/scene-1.md'],
        'outline/chapter-1': ['scene-3.md', 'scene-2.md', 'scene-1.md'],
      }
      const scoped = scopeCorkboardOrder(order, 'outline/')
      expect(Object.keys(scoped!)).toEqual(['', 'chapter-1'])
      expect(scoped!['']).toEqual(['intro.md', 'chapter-1/scene-1.md'])
      expect(scoped!['chapter-1']).toEqual(['scene-3.md', 'scene-2.md', 'scene-1.md'])
    })

    it('filters keys that belong to a different section', () => {
      const order = {
        'book': ['scene-a.md'],
        'lore': ['place-a.md'],
        'outline': ['scene-b.md'],
      }
      const scoped = scopeCorkboardOrder(order, 'book/')
      expect(Object.keys(scoped!)).toEqual([''])
      expect(scoped!['lore']).toBeUndefined()
    })

    it('returns undefined when input is undefined', () => {
      expect(scopeCorkboardOrder(undefined, 'book/')).toBeUndefined()
    })

    it('strips folder prefix from file ids within each key', () => {
      const order = {
        'book/Act-01': ['book/Act-01/scene-2.md', 'book/Act-01/scene-1.md'],
      }
      const scoped = scopeCorkboardOrder(order, 'book/')
      expect(scoped!['Act-01']).toEqual(['scene-2.md', 'scene-1.md'])
    })
  })

  describe('sortTreeRowsByOrder: reorder persistence cycle', () => {
    it('applies corkboardOrder to sidebar tree rows preserving folder structure', () => {
      const tree = buildSidebarTree(['Act-01/scene-a.md', 'Act-01/scene-b.md', 'Act-01/scene-c.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['Act-01']))
      const sorted = sortTreeRowsByOrder(rows, { 'Act-01': ['scene-c.md', 'scene-a.md', 'scene-b.md'] })

      expect(sorted.map((r) => r.path)).toEqual([
        'Act-01',
        'Act-01/scene-c.md',
        'Act-01/scene-a.md',
        'Act-01/scene-b.md',
      ])
    })

    it('does not reorder collapsed folder children', () => {
      const tree = buildSidebarTree(['Act-01/scene-a.md', 'Act-01/scene-b.md'])
      const rows = getVisibleSidebarRows(tree, new Set())
      const sorted = sortTreeRowsByOrder(rows, { 'Act-01': ['scene-b.md', 'scene-a.md'] })

      expect(sorted.map((r) => r.path)).toEqual(['Act-01'])
    })

    it('applies root-level order with empty string key', () => {
      const tree = buildSidebarTree(['scene-a.md', 'scene-b.md', 'scene-c.md'])
      const rows = getVisibleSidebarRows(tree, new Set())
      const sorted = sortTreeRowsByOrder(rows, { '': ['scene-b.md', 'scene-c.md', 'scene-a.md'] })

      expect(sorted.map((r) => r.path)).toEqual(['scene-b.md', 'scene-c.md', 'scene-a.md'])
    })

    it('keeps unlisted files in alphabetical order after ordered ones', () => {
      const tree = buildSidebarTree(['Act-01/scene-a.md', 'Act-01/scene-b.md', 'Act-01/scene-c.md', 'Act-01/scene-d.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['Act-01']))
      const sorted = sortTreeRowsByOrder(rows, { 'Act-01': ['scene-c.md'] })

      const paths = sorted.map((r) => r.path)
      expect(paths).toEqual(['Act-01', 'Act-01/scene-c.md', 'Act-01/scene-a.md', 'Act-01/scene-b.md', 'Act-01/scene-d.md'])
    })

    it('preserves nested folder structure when reordering', () => {
      const tree = buildSidebarTree([
        'Act-01/Ch-01/scene-1.md',
        'Act-01/Ch-01/scene-2.md',
        'Act-01/Ch-02/scene-3.md',
      ])
      const rows = getVisibleSidebarRows(tree, new Set(['Act-01', 'Act-01/Ch-01', 'Act-01/Ch-02']))
      const sorted = sortTreeRowsByOrder(rows, { 'Act-01/Ch-01': ['scene-2.md', 'scene-1.md'] })

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
  })

  describe('drag-drop sibling file list construction', () => {
    it('builds sibling file list for section-root folder (empty path)', () => {
      const tree = buildSidebarTree(['scene-a.md', 'scene-b.md', 'scene-c.md'])
      const rows = getVisibleSidebarRows(tree, new Set())

      const siblingFiles = rows.filter(
        (r) => r.type === 'file' && (r.depth === 0) && (!r.path.includes('/')),
      )
      const paths = siblingFiles.map((r) => r.path)

      expect(paths).toEqual(['scene-a.md', 'scene-b.md', 'scene-c.md'])
    })

    it('builds sibling file list for nested folder', () => {
      const tree = buildSidebarTree(['Act-01/scene-a.md', 'Act-01/scene-b.md', 'Act-01/scene-c.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['Act-01']))

      const siblingFiles = rows.filter(
        (r) => r.type === 'file' && r.depth === 1 && r.path.startsWith('Act-01/'),
      )
      const paths = siblingFiles.map((r) => r.path)

      expect(paths).toEqual(['Act-01/scene-a.md', 'Act-01/scene-b.md', 'Act-01/scene-c.md'])
    })

    it('excludes files from other folders when building sibling list', () => {
      const tree = buildSidebarTree([
        'Act-01/scene-a.md',
        'Act-01/scene-b.md',
        'Act-02/scene-c.md',
      ])
      const rows = getVisibleSidebarRows(tree, new Set(['Act-01', 'Act-02']))

      const act1Files = rows.filter(
        (r) => r.type === 'file' && r.path.startsWith('Act-01/'),
      )
      const paths = act1Files.map((r) => r.path)

      expect(paths).toEqual(['Act-01/scene-a.md', 'Act-01/scene-b.md'])
      expect(paths).not.toContain('Act-02/scene-c.md')
    })
  })

  describe('corkboardOrder roundtrip: index write → scope → sort', () => {
    it('writes project-relative order to index and applies it after scope conversion', () => {
      const indexOrder: Record<string, string[]> = {
        'book': ['intro.md', 'ch-01.md'],
        'book/Act-01': ['scene-2.md', 'scene-1.md'],
      }

      const scoped = scopeCorkboardOrder(indexOrder, 'book/')

      const scopedFiles = ['intro.md', 'ch-01.md', 'Act-01/scene-1.md', 'Act-01/scene-2.md']
      const scopedTree = buildSidebarTree(scopedFiles)
      const rows = getVisibleSidebarRows(scopedTree, new Set(['Act-01']))
      const sorted = sortTreeRowsByOrder(rows, scoped!)

      expect(sorted.find((r) => r.path === 'Act-01')).toBeDefined()
      const act1Children = sorted.filter((r) => r.path.startsWith('Act-01/'))
      expect(act1Children.map((r) => r.path)).toEqual([
        'Act-01/scene-2.md',
        'Act-01/scene-1.md',
      ])
    })
  })
})
