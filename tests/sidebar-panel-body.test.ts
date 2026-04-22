import { describe, expect, it, vi } from 'vitest'
import { scopeCorkboardOrder, buildScopedReorderHandler } from '../src/features/project-editor/components/sidebar/sidebar-panel-body'

describe('sidebar panel body path scoping', () => {
  describe('scopeCorkboardOrder', () => {
    it('strips section root prefix from keys', () => {
      const order = {
        'outline': ['scene-a.md', 'scene-b.md'],
        'outline/Act-01': ['outline/Act-01/scene-x.md'],
      }

      const scoped = scopeCorkboardOrder(order, 'outline')

      expect(scoped).toEqual({
        '': ['scene-a.md', 'scene-b.md'],
        'Act-01': ['scene-x.md'],
      })
    })

    it('returns undefined for undefined input', () => {
      expect(scopeCorkboardOrder(undefined, 'outline')).toBeUndefined()
    })

    it('ignores keys from other sections', () => {
      const order = {
        'outline': ['scene-a.md'],
        'book': ['chapter-1.md'],
      }

      const scoped = scopeCorkboardOrder(order, 'outline')

      expect(scoped).toEqual({
        '': ['scene-a.md'],
      })
    })
  })

  describe('buildScopedReorderHandler', () => {
    it('converts section-relative paths to project-relative paths', async () => {
      const onReorderFiles = vi.fn().mockResolvedValue(undefined)
      const withRoot = (path: string) => `outline/${path}`

      const handler = buildScopedReorderHandler(onReorderFiles, withRoot, 'outline')
      expect(handler).toBeDefined()

      await handler!('Act-01', ['scene-b.md', 'scene-a.md'])

      expect(onReorderFiles).toHaveBeenCalledWith(
        'outline/Act-01',
        ['outline/scene-b.md', 'outline/scene-a.md'],
      )
    })

    it('uses section root when folderPath is empty', async () => {
      const onReorderFiles = vi.fn().mockResolvedValue(undefined)
      const withRoot = (path: string) => `outline/${path}`

      const handler = buildScopedReorderHandler(onReorderFiles, withRoot, 'outline')

      await handler!('', ['scene-a.md'])

      expect(onReorderFiles).toHaveBeenCalledWith(
        'outline',
        ['outline/scene-a.md'],
      )
    })

    it('returns undefined when onReorderFiles is undefined', () => {
      const handler = buildScopedReorderHandler(undefined, (p) => p, 'outline')
      expect(handler).toBeUndefined()
    })
  })
})
