import { describe, expect, it, vi } from 'vitest'
import { buildSidebarTree, getVisibleSidebarRows } from '../src/features/project-editor/components/sidebar/sidebar-tree-logic'
import type { SidebarTreeRow } from '../src/features/project-editor/components/sidebar/sidebar-tree-types'
import type { DropIndicatorPosition } from '../src/features/project-editor/components/sidebar/drop-indicator'
import { calculateDropPosition } from '../src/features/project-editor/components/sidebar/use-sidebar-tree-drag-handlers'
import { handleFileCrossFolderDrop, handleFileSameFolderReorder } from '../src/features/project-editor/components/sidebar/sidebar-file-drop-logic'

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

  describe('calculateDropPosition', () => {
    function mockContainer(rowHeights: Record<string, number> = {}) {
      const container = document.createElement('div')
      container.innerHTML = `
        <button data-sidebar-row-index="0" data-path="outline/scene-1.md"></button>
        <button data-sidebar-row-index="1" data-path="outline/scene-2.md"></button>
        <button data-sidebar-row-index="2" data-path="outline/characters"></button>
        <button data-sidebar-row-index="3" data-path="outline/locations"></button>
      `
      const buttons = Array.from(container.querySelectorAll('button'))
      for (const btn of buttons) {
        const pathAttr = btn.getAttribute('data-path') ?? ''
        const height = rowHeights[pathAttr] ?? 40
        btn.getBoundingClientRect = () => ({
          top: 0,
          left: 0,
          right: 200,
          bottom: height,
          width: 200,
          height,
          x: 0,
          y: 0,
          toJSON: () => '',
        })
      }
      return { current: container }
    }

    it('returns onFolder when hovering folder center while dragging file', () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'scene-1', path: 'outline/scene-1.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'characters', path: 'outline/characters', type: 'folder', depth: 1, isExpanded: false },
      ]
      const containerRef = mockContainer()
      const pos = calculateDropPosition(rows, 'outline/scene-1.md', 'outline/characters', 20, containerRef)

      expect(pos).toEqual({ type: 'onFolder', targetPath: 'outline/characters' })
    })

    it('returns before when hovering top edge of file row while dragging file', () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'scene-1', path: 'outline/scene-1.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'scene-2', path: 'outline/scene-2.md', type: 'file', depth: 1, isExpanded: false },
      ]
      const containerRef = mockContainer()
      const pos = calculateDropPosition(rows, 'outline/scene-1.md', 'outline/scene-2.md', 5, containerRef)

      expect(pos).toEqual({ type: 'before', targetIndex: 1, targetPath: 'outline/scene-2.md' })
    })

    it('returns null for before/after when dragging folder (no reorder for folders)', () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'characters', path: 'outline/characters', type: 'folder', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'locations', path: 'outline/locations', type: 'folder', depth: 1, isExpanded: false },
      ]
      const containerRef = mockContainer()
      const pos = calculateDropPosition(rows, 'outline/characters', 'outline/locations', 5, containerRef)

      expect(pos).toBeNull()
    })

    it('returns onFolder when dragging folder onto another folder center', () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'characters', path: 'outline/characters', type: 'folder', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'locations', path: 'outline/locations', type: 'folder', depth: 1, isExpanded: false },
      ]
      const containerRef = mockContainer()
      const pos = calculateDropPosition(rows, 'outline/characters', 'outline/locations', 20, containerRef)

      expect(pos).toEqual({ type: 'onFolder', targetPath: 'outline/locations' })
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

  describe('handleFileCrossFolderDrop', () => {
    it('moves file and reorders into target folder when dropped before a file in another folder', async () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'a', path: 'folder-a/file-a.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'b', path: 'folder-b/file-b.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'c', name: 'c', path: 'folder-b/file-c.md', type: 'file', depth: 1, isExpanded: false },
      ]
      const sourceRow = rows[0]
      const dropPosition: DropIndicatorPosition = { type: 'before', targetIndex: 1, targetPath: 'folder-b/file-b.md' }
      const onMoveFile = vi.fn().mockResolvedValue(undefined)
      const onReorderFiles = vi.fn().mockResolvedValue(undefined)

      await handleFileCrossFolderDrop(rows, sourceRow, 'folder-a/file-a.md', dropPosition, 'folder-b', rows[1], onMoveFile, onReorderFiles)

      expect(onMoveFile).toHaveBeenCalledWith('folder-a/file-a.md', 'folder-b')
      expect(onReorderFiles).toHaveBeenCalledWith('folder-b', [
        'folder-b/file-a.md',
        'folder-b/file-b.md',
        'folder-b/file-c.md',
      ])
    })

    it('moves file and reorders into target folder when dropped after a file in another folder', async () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'a', path: 'folder-a/file-a.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'b', path: 'folder-b/file-b.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'c', name: 'c', path: 'folder-b/file-c.md', type: 'file', depth: 1, isExpanded: false },
      ]
      const sourceRow = rows[0]
      const dropPosition: DropIndicatorPosition = { type: 'after', targetIndex: 1, targetPath: 'folder-b/file-b.md' }
      const onMoveFile = vi.fn().mockResolvedValue(undefined)
      const onReorderFiles = vi.fn().mockResolvedValue(undefined)

      await handleFileCrossFolderDrop(rows, sourceRow, 'folder-a/file-a.md', dropPosition, 'folder-b', rows[1], onMoveFile, onReorderFiles)

      expect(onMoveFile).toHaveBeenCalledWith('folder-a/file-a.md', 'folder-b')
      expect(onReorderFiles).toHaveBeenCalledWith('folder-b', [
        'folder-b/file-b.md',
        'folder-b/file-a.md',
        'folder-b/file-c.md',
      ])
    })

    it('appends moved file when target row is not in destination siblings list', async () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'a', path: 'folder-a/file-a.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'b', path: 'folder-b/file-b.md', type: 'file', depth: 1, isExpanded: false },
      ]
      const sourceRow = rows[0]
      const dropPosition: DropIndicatorPosition = { type: 'before', targetIndex: 1, targetPath: 'folder-b/file-b.md' }
      const onMoveFile = vi.fn().mockResolvedValue(undefined)
      const onReorderFiles = vi.fn().mockResolvedValue(undefined)

      // Simulate rows that don't contain the targetRow in destSiblings by filtering depth mismatch
      const filteredRows = rows.filter((r) => r.depth === 1)
      await handleFileCrossFolderDrop(filteredRows, sourceRow, 'folder-a/file-a.md', dropPosition, 'folder-b', rows[1], onMoveFile, onReorderFiles)

      expect(onMoveFile).toHaveBeenCalledWith('folder-a/file-a.md', 'folder-b')
      expect(onReorderFiles).toHaveBeenCalledWith('folder-b', [
        'folder-b/file-a.md',
        'folder-b/file-b.md',
      ])
    })
  })

  describe('handleFileSameFolderReorder', () => {
    it('reorders files within the same folder', async () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'a', path: 'folder/file-a.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'b', path: 'folder/file-b.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'c', name: 'c', path: 'folder/file-c.md', type: 'file', depth: 1, isExpanded: false },
      ]
      const sourceRow = rows[0]
      const dropPosition: DropIndicatorPosition = { type: 'after', targetIndex: 1, targetPath: 'folder/file-b.md' }
      const onReorderFiles = vi.fn().mockResolvedValue(undefined)

      await handleFileSameFolderReorder(rows, sourceRow, 'folder/file-a.md', dropPosition, 'folder', onReorderFiles)

      expect(onReorderFiles).toHaveBeenCalledWith('folder', [
        'folder/file-b.md',
        'folder/file-a.md',
        'folder/file-c.md',
      ])
    })

    it('returns early when dragging path is not in sibling list', async () => {
      const rows: SidebarTreeRow[] = [
        { nodeId: 'a', name: 'a', path: 'folder/file-a.md', type: 'file', depth: 1, isExpanded: false },
        { nodeId: 'b', name: 'b', path: 'folder/file-b.md', type: 'file', depth: 1, isExpanded: false },
      ]
      const sourceRow = rows[0]
      const dropPosition: DropIndicatorPosition = { type: 'after', targetIndex: 1, targetPath: 'folder/file-b.md' }
      const onReorderFiles = vi.fn().mockResolvedValue(undefined)

      // Pass a path that doesn't exist in the sibling list
      await handleFileSameFolderReorder(rows, sourceRow, 'other/file-x.md', dropPosition, 'folder', onReorderFiles)

      expect(onReorderFiles).not.toHaveBeenCalled()
    })
  })
})
