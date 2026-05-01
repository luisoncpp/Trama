import { describe, expect, it, vi } from 'vitest'
import {
  buildTagOverlayMatches,
  resolveTagBounds,
  mapPlainTextIndexToQuillIndex,
} from '../src/features/project-editor/components/rich-markdown-editor-tag-overlay'
import { findTagMatchesInText, filterMatchesOutsideCode } from '../src/features/project-editor/components/rich-markdown-editor-tag-helpers'

describe('tag overlay stale positions on typing (regression: distortion in unsaved files)', () => {
  const tagIndex = {
    aina: 'lore/characters/Aina.md',
    lirio: 'lore/places/ciudad-principal.md',
    magia: 'lore/concepts/magia.md',
  }

  describe('findTagMatchesInText returns fresh positions on every call', () => {
    it('returns different positions when text content changes (typing simulation)', () => {
      const initialText = 'Aina y Lirio\n'
      const afterTyping = 'Aina y Lirio Magia y\n'

      const initialMatches = findTagMatchesInText(initialText, tagIndex)
      const afterTypingMatches = findTagMatchesInText(afterTyping, tagIndex)

      expect(initialMatches).toHaveLength(2)
      expect(afterTypingMatches).toHaveLength(3)

      expect(initialMatches.map((m) => m.tag)).toEqual(['aina', 'lirio'])
      expect(afterTypingMatches.map((m) => m.tag)).toEqual(['aina', 'lirio', 'magia'])

      expect(afterTypingMatches[0].start).toBe(initialMatches[0].start)
      expect(afterTypingMatches[0].end).toBe(initialMatches[0].end)
    })

    it('positions reflect actual text offsets, not a cached previous render', () => {
      const localTagIndex = {
        aina: 'lore/characters/Aina.md',
        lirio: 'lore/places/ciudad-principal.md',
        magia: 'lore/concepts/magia.md',
      }
      const editorText = 'Aina Lirio Magia\n'
      const matches = findTagMatchesInText(editorText, localTagIndex)

      expect(matches).toHaveLength(3)
      expect(matches[0].tag).toBe('aina')
      expect(matches[0].start).toBe(0)
      expect(matches[1].tag).toBe('lirio')
      expect(matches[1].start).toBe(5)
      expect(matches[2].tag).toBe('magia')
      expect(matches[2].start).toBe(11)
    })

    it('deleting text updates match positions correctly', () => {
      const originalText = 'Aina Lirio Magia\n'
      const afterDelete = 'Aina Lirio\n'

      const originalMatches = findTagMatchesInText(originalText, tagIndex)
      const afterDeleteMatches = findTagMatchesInText(afterDelete, tagIndex)

      expect(originalMatches).toHaveLength(3)
      expect(afterDeleteMatches).toHaveLength(2)

      expect(afterDeleteMatches.find((m) => m.tag === 'aina')!.start).toBe(0)
      expect(afterDeleteMatches.find((m) => m.tag === 'lirio')!.start).toBe(5)
      expect(afterDeleteMatches.find((m) => m.tag === 'magia')).toBeUndefined()
    })
  })

  describe('buildTagOverlayMatches computes fresh bounds every call', () => {
    it('getBounds is called fresh on every invocation, not cached', () => {
      const getBounds = vi.fn((index: number, length: number) => ({
        top: 0,
        left: index * 10,
        width: length * 10,
        height: 16,
      }))

      const editor = {
        getText: () => 'Aina Lirio\n',
        getContents: () => ({ ops: [{ insert: 'Aina Lirio\n' }] }),
        getBounds,
      } as any

      const first = buildTagOverlayMatches(editor, tagIndex)
      expect(first).toHaveLength(2)

      getBounds.mockClear()

      const second = buildTagOverlayMatches(editor, tagIndex)
      expect(second).toHaveLength(2)

      expect(getBounds).toHaveBeenCalledTimes(2)
    })

    it('different editor content produces different bound positions', () => {
      let callCount = 0
      const getBounds = vi.fn((index: number, length: number) => {
        callCount++
        return {
          top: callCount * 10,
          left: index * 10,
          width: length * 10,
          height: 16,
        }
      })

      const editor = {
        getText: () => 'Aina\n',
        getContents: () => ({ ops: [{ insert: 'Aina\n' }] }),
        getBounds,
      } as any

      const result1 = buildTagOverlayMatches(editor, tagIndex)
      expect(result1[0].rects[0]?.top).toBe(10)

      getBounds.mockClear()
      callCount = 0

      const result2 = buildTagOverlayMatches(editor, tagIndex)
      expect(result2[0].rects[0]?.top).toBe(10)
    })
  })

  describe('resolveTagBounds fresh on each call', () => {
    it('calling resolveTagBounds twice returns fresh bounds each time (not memoized)', () => {
      let layoutVersion = 0
      const getBounds = vi.fn((_index: number, _length: number) => ({
        top: layoutVersion * 50,
        left: 0,
        width: 40,
        height: 16,
      }))

      const editor = {
        getText: () => 'Aina Lirio\n',
        getContents: () => ({ ops: [{ insert: 'Aina Lirio\n' }] }),
        getBounds,
      } as any

      const text = editor.getText()
      const matches = filterMatchesOutsideCode(text, findTagMatchesInText(text, tagIndex))

      layoutVersion = 0
      const first = resolveTagBounds(editor, matches)

      layoutVersion = 1
      const second = resolveTagBounds(editor, matches)

      expect(first[0].rects[0]?.top).toBe(0)
      expect(second[0].rects[0]?.top).toBe(50)
      expect(first[0].rects).not.toEqual(second[0].rects)
    })
  })

  describe('findTagMatchesInText accent normalization', () => {
    it('matches accented text with non-accented tag', () => {
      const accentIndex = { cancion: 'lore/songs/cancion.md' }

      expect(findTagMatchesInText('una canción bella', accentIndex)).toHaveLength(1)
      expect(findTagMatchesInText('una cancion bella', accentIndex)).toHaveLength(1)
    })

    it('matches non-accented text with accented tag', () => {
      const accentIndex = { canción: 'lore/songs/cancion.md' }

      expect(findTagMatchesInText('una canción bella', accentIndex)).toHaveLength(1)
      expect(findTagMatchesInText('una cancion bella', accentIndex)).toHaveLength(1)
    })

    it('matches different accent variations of same base word', () => {
      const accentIndex = { magia: 'lore/concepts/magia.md' }

      expect(findTagMatchesInText('magia oscura', accentIndex)).toHaveLength(1)
      expect(findTagMatchesInText('magiaoscura', accentIndex)).toHaveLength(0)
      expect(findTagMatchesInText('MAGIA', accentIndex)).toHaveLength(1)
    })

    it('returns tag original (not normalized) in match result', () => {
      const accentIndex = { canción: 'lore/songs/cancion.md' }
      const matches = findTagMatchesInText('una canción bella', accentIndex)

      expect(matches).toHaveLength(1)
      expect(matches[0].tag).toBe('canción')
    })

    it('handles mixed accents in both text and tag', () => {
      const accentIndex = { corazón: 'lore/heart/corazon.md' }

      const matches = findTagMatchesInText('el corazón late', accentIndex)
      expect(matches).toHaveLength(1)

      const plainMatches = findTagMatchesInText('el corazon late', accentIndex)
      expect(plainMatches).toHaveLength(1)

      const upperMatches = findTagMatchesInText('el CORAZON late', accentIndex)
      expect(upperMatches).toHaveLength(1)
    })
  })

  describe('findTagMatchesInText file switch (regression: stale matches on doc change)', () => {
    it('matches from one document do not appear in another document', () => {
      const tagIndex = { aina: 'lore/characters/Aina.md' }

      const doc1Text = 'Aina está en la historia'
      const doc2Text = 'Lirio camina por el bosque'

      const doc1Matches = findTagMatchesInText(doc1Text, tagIndex)
      const doc2Matches = findTagMatchesInText(doc2Text, tagIndex)

      expect(doc1Matches).toHaveLength(1)
      expect(doc1Matches[0].tag).toBe('aina')
      expect(doc2Matches).toHaveLength(0)
    })

    it('same tagIndex with completely different text gives correct matches per document', () => {
      const tagIndex = { magia: 'lore/concepts/magia.md', lirio: 'lore/places/lirio.md' }

      const doc1 = 'Magia en el cielo'
      const doc2 = 'Lirio es un lugar'

      const matches1 = findTagMatchesInText(doc1, tagIndex)
      const matches2 = findTagMatchesInText(doc2, tagIndex)

      expect(matches1.map((m) => m.tag)).toEqual(['magia'])
      expect(matches2.map((m) => m.tag)).toEqual(['lirio'])
    })

    it('positions are relative to current document text, not previous', () => {
      const tagIndex = { test: 'lore/test.md' }

      const doc1 = 'test al inicio'
      const doc2 = 'al inicio test'

      const matches1 = findTagMatchesInText(doc1, tagIndex)
      const matches2 = findTagMatchesInText(doc2, tagIndex)

      expect(matches1[0].start).toBe(0)
      expect(matches2[0].start).toBe(10)
    })
  })

  describe('mapPlainTextIndexToQuillIndex handles content changes', () => {
    it('same plain offset maps to different Quill index when content differs', () => {
      const editorWithEmbed = {
        getText: () => 'Satake\ncaminó\n',
        getContents: () => ({
          ops: [
            { insert: 'Satake\n' },
            { insert: { tramaDirective: 'pagebreak' } },
            { insert: 'caminó\n' },
          ],
        }),
      } as any

      const editorPlain = {
        getText: () => 'Satake\ncaminó\n',
        getContents: () => ({
          ops: [{ insert: 'Satake\ncaminó\n' }],
        }),
      } as any

      const plainIndex = 7

      const withEmbed = mapPlainTextIndexToQuillIndex(editorWithEmbed, plainIndex)
      const withoutEmbed = mapPlainTextIndexToQuillIndex(editorPlain, plainIndex)

      expect(withEmbed).not.toBe(plainIndex)
      expect(withoutEmbed).toBe(plainIndex)
    })
  })

  describe('architecture: text matching vs bounds computation separation', () => {
    it('TagMatch objects contain only text offsets, never bounds (decoupled from layout)', () => {
      const text = 'Aina Lirio\n'
      const matches = findTagMatchesInText(text, tagIndex)

      for (const match of matches) {
        expect(match).not.toHaveProperty('rects')
        expect(match).toHaveProperty('start')
        expect(match).toHaveProperty('end')
        expect(match).toHaveProperty('tag')
        expect(match).toHaveProperty('filePath')
      }
    })

    it('rects are only added by buildTagOverlayMatches or resolveTagBounds at call time', () => {
      const getBounds = vi.fn(() => ({ top: 0, left: 0, width: 50, height: 16 }))

      const editor = {
        getText: () => 'Aina Lirio\n',
        getContents: () => ({ ops: [{ insert: 'Aina Lirio\n' }] }),
        getBounds,
      } as any

      const text = editor.getText()
      const matches = filterMatchesOutsideCode(text, findTagMatchesInText(text, tagIndex))

      expect(matches[0]).not.toHaveProperty('rects')

      const withRects = resolveTagBounds(editor, matches)
      expect(withRects[0]).toHaveProperty('rects')
    })
  })
})