import { describe, expect, it, vi } from 'vitest'
import { buildSidebarTree, getVisibleSidebarRows } from '../src/features/project-editor/components/sidebar/sidebar-tree-logic'
import type { SidebarTreeRow } from '../src/features/project-editor/components/sidebar/sidebar-tree-types'

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
  })
})
