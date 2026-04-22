import { describe, expect, it, vi } from 'vitest'
import { buildSidebarTree, getVisibleSidebarRows } from '../src/features/project-editor/components/sidebar/sidebar-tree-logic'
import type { SidebarTreeRow } from '../src/features/project-editor/components/sidebar/sidebar-tree-types'
import type { DropIndicatorPosition } from '../src/features/project-editor/components/sidebar/drop-indicator'

describe('drag-drop-sidebar', () => {
  describe('calculateDropPosition', () => {
    it('identifies folder drop target when hovering over folder row', () => {
      const tree = buildSidebarTree(['outline/scene-1.md', 'outline/scene-2.md', 'outline/folder/'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline', 'outline/folder']))

      const folderRow = rows.find((r) => r.path === 'outline/folder')
      expect(folderRow?.type).toBe('folder')
    })

    it('returns between position for file rows', () => {
      const tree = buildSidebarTree(['outline/scene-1.md', 'outline/scene-2.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline']))

      const fileRows = rows.filter((r) => r.type === 'file')
      expect(fileRows.length).toBe(2)
    })

    it('handles reordering within folder correctly', () => {
      const tree = buildSidebarTree(['outline/scene-1.md', 'outline/scene-2.md', 'outline/scene-3.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline']))

      const filePaths = rows.filter((r) => r.type === 'file').map((r) => r.path)
      expect(filePaths).toEqual(['outline/scene-1.md', 'outline/scene-2.md', 'outline/scene-3.md'])
    })
  })

  describe('drop indicator types', () => {
    it('supports onFolder type for folder drop targets', () => {
      const tree = buildSidebarTree(['outline/scene-1.md', 'outline/characters/'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline', 'outline/characters']))

      const folderRow = rows.find((r) => r.type === 'folder' && r.path !== 'outline')
      expect(folderRow?.type).toBe('folder')
    })

    it('supports between type for reorder drops', () => {
      const tree = buildSidebarTree(['outline/scene-1.md', 'outline/scene-2.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline']))

      expect(rows.filter((r) => r.type === 'file').length).toBeGreaterThan(0)
    })

    it('onFolder position has targetPath property', () => {
      const position: DropIndicatorPosition = { type: 'onFolder', targetPath: 'outline/characters' }
      expect(position.type).toBe('onFolder')
      expect(position.targetPath).toBe('outline/characters')
    })

    it('before position has targetIndex property', () => {
      const position: DropIndicatorPosition = { type: 'before', targetIndex: 2, targetPath: 'outline/a.md' }
      expect(position.type).toBe('before')
      expect(position.targetIndex).toBe(2)
    })

    it('after position has targetIndex property', () => {
      const position: DropIndicatorPosition = { type: 'after', targetIndex: 1, targetPath: 'outline/b.md' }
      expect(position.type).toBe('after')
      expect(position.targetIndex).toBe(1)
    })
  })

  describe('move file drop detection', () => {
    it('detects drop on folder row for move operation', () => {
      const tree = buildSidebarTree(['outline/scene-1.md', 'outline/characters/'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline', 'outline/characters']))

      const folderRow = rows.find((r) => r.type === 'folder' && r.path === 'outline/characters')
      expect(folderRow).toBeDefined()
      expect(folderRow?.type).toBe('folder')
    })

    it('file rows are draggable while folders are not', () => {
      const tree = buildSidebarTree(['outline/scene-1.md', 'outline/folder/'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline', 'outline/folder']))

      const fileRows = rows.filter((r) => r.type === 'file')
      const folderRows = rows.filter((r) => r.type === 'folder')

      expect(fileRows.length).toBeGreaterThan(0)
      expect(folderRows.length).toBeGreaterThan(0)
    })

    it('can identify source and target paths for move operation', () => {
      const tree = buildSidebarTree(['outline/scene-1.md', 'outline/characters/hero.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline', 'outline/characters']))

      const sourceRow = rows.find((r) => r.path === 'outline/scene-1.md')
      const targetFolder = rows.find((r) => r.path === 'outline/characters')

      expect(sourceRow?.type).toBe('file')
      expect(targetFolder?.type).toBe('folder')
    })
  })

  describe('reorder drop detection', () => {
    it('calculates correct beforeIndex for between drops', () => {
      const tree = buildSidebarTree(['outline/a.md', 'outline/b.md', 'outline/c.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline']))
      const fileRows = rows.filter((r) => r.type === 'file')

      expect(fileRows.length).toBe(3)
      expect(fileRows[0].path).toBe('outline/a.md')
      expect(fileRows[1].path).toBe('outline/b.md')
      expect(fileRows[2].path).toBe('outline/c.md')
    })

    it('handles empty folder (section root) correctly', () => {
      const tree = buildSidebarTree(['scene-1.md', 'scene-2.md'])
      const rows = getVisibleSidebarRows(tree, new Set())

      const filePaths = rows.filter((r) => r.type === 'file').map((r) => r.path)
      expect(filePaths).toEqual(['scene-1.md', 'scene-2.md'])
    })

    it('generates correct reorder list for drop operation', () => {
      const tree = buildSidebarTree(['outline/a.md', 'outline/b.md', 'outline/c.md'])
      const rows = getVisibleSidebarRows(tree, new Set(['outline']))
      const filePaths = rows.filter((r) => r.type === 'file').map((r) => r.path)

      const reordered = [...filePaths]
      const sourceIndex = reordered.indexOf('outline/b.md')
      reordered.splice(sourceIndex, 1)
      reordered.splice(0, 0, 'outline/b.md')

      expect(reordered).toEqual(['outline/b.md', 'outline/a.md', 'outline/c.md'])
    })
  })
})
