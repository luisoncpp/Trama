import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TagIndexService } from '../electron/services/tag-index-service'
import type { DocumentMeta } from '../src/shared/ipc'

const ROOT = '/project'

describe('tag-index-service', () => {
  let service: TagIndexService

  beforeEach(() => {
    service = new TagIndexService()
  })

  describe('buildIndex', () => {
    it('builds index from markdown files with tags in meta', async () => {
      const markdownFiles = ['lore/place.md', 'lore/person.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/place.md': { id: 'norte', tags: ['norte', 'norte salvaje'] },
        'lore/person.md': { id: 'el-explorador', tags: ['explorador'] },
      }

      await service.buildIndex(markdownFiles, metaByPath)

      expect(service.size).toBe(3)
    })

    it('normalizes tags to lowercase', async () => {
      const markdownFiles = ['lore/place.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/place.md': { id: 'test', tags: ['Norte', 'NORTE', 'norte'] },
      }

      await service.buildIndex(markdownFiles, metaByPath)

      expect(service.size).toBe(1)
    })

    it('handles duplicate tags by keeping first and logging warning', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const markdownFiles = ['lore/a.md', 'lore/b.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/a.md': { id: 'a', tags: ['magia'] },
        'lore/b.md': { id: 'b', tags: ['magia'] },
      }

      await service.buildIndex(markdownFiles, metaByPath)

      expect(service.size).toBe(1)
      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })

    it('ignores files without meta or tags', async () => {
      const markdownFiles = ['lore/empty.md', 'lore/no-tags.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/empty.md': { id: 'empty' },
        'lore/no-tags.md': { id: 'no-tags', tags: [] },
      }

      await service.buildIndex(markdownFiles, metaByPath)

      expect(service.size).toBe(0)
    })

    it('trims whitespace from tags', async () => {
      const markdownFiles = ['lore/place.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/place.md': { id: 'test', tags: ['  magia  ', ' norte '] },
      }

      await service.buildIndex(markdownFiles, metaByPath)

      expect(service.size).toBe(2)
    })
  })

  describe('resolveMatches', () => {
    it('finds tag matches in text with word boundaries', async () => {
      const markdownFiles = ['lore/place.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/place.md': { id: 'norte', tags: ['norte'] },
      }
      await service.buildIndex(markdownFiles, metaByPath)

      const matches = service.resolveMatches('El norte está frío.')

      expect(matches).toHaveLength(1)
      expect(matches[0].filePath).toBe('lore/place.md')
      expect(matches[0].start).toBe(3)
      expect(matches[0].end).toBe(8)
    })

    it('does not match partial words (word boundaries)', async () => {
      const markdownFiles = ['lore/place.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/place.md': { id: 'magia', tags: ['magia'] },
      }
      await service.buildIndex(markdownFiles, metaByPath)

      const matches = service.resolveMatches('magiaoscura')

      expect(matches).toHaveLength(0)
    })

    it('matches case-insensitively', async () => {
      const markdownFiles = ['lore/place.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/place.md': { id: 'norte', tags: ['norte'] },
      }
      await service.buildIndex(markdownFiles, metaByPath)

      const matches = service.resolveMatches('El NORTE está frío.')

      expect(matches).toHaveLength(1)
    })

    it('returns longest match first when multiple matches exist', async () => {
      const markdownFiles = ['lore/place.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/place.md': { id: 'norte', tags: ['norte', 'norte salvaje'] },
      }
      await service.buildIndex(markdownFiles, metaByPath)

      const matches = service.resolveMatches('El norte salvaje')

      expect(matches).toHaveLength(1)
      expect(matches[0].tag).toBe('norte salvaje')
      expect(matches[0].start).toBe(3)
      expect(matches[0].end).toBe(16)
    })

    it('handles multiple non-overlapping matches', async () => {
      const markdownFiles = ['lore/places.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/places.md': { id: 'places', tags: ['norte', 'sur'] },
      }
      await service.buildIndex(markdownFiles, metaByPath)

      const matches = service.resolveMatches('El norte y el sur')

      expect(matches).toHaveLength(2)
      expect(matches[0].tag).toBe('norte')
      expect(matches[1].tag).toBe('sur')
    })

    it('returns matches sorted by start position', async () => {
      const markdownFiles = ['lore/places.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/places.md': { id: 'places', tags: ['sur', 'norte'] },
      }
      await service.buildIndex(markdownFiles, metaByPath)

      const matches = service.resolveMatches('El norte y el sur')

      expect(matches).toHaveLength(2)
      expect(matches[0].start).toBe(3)
      expect(matches[1].start).toBe(14)
    })
  })

  describe('clearIndex', () => {
    it('clears all tags from index', async () => {
      const markdownFiles = ['lore/place.md']
      const metaByPath: Record<string, DocumentMeta> = {
        'lore/place.md': { id: 'norte', tags: ['norte'] },
      }
      await service.buildIndex(markdownFiles, metaByPath)

      await service.clearIndex()

      expect(service.size).toBe(0)
    })
  })
})
