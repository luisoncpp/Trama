import { describe, expect, it } from 'vitest'
import {
  findTagMatchesInText,
  filterMatchesOutsideCode,
  isInsideCodeBlock,
  removeAccents,
  escapeRegExp,
} from '../src/features/project-editor/components/rich-markdown-editor-tag-helpers'

describe('removeAccents', () => {
  it('removes combining diacritical marks (NFD normalization)', () => {
    expect(removeAccents('café')).toBe('cafe')
    expect(removeAccents('canción')).toBe('cancion')
    expect(removeAccents('mágica')).toBe('magica')
  })

  it('handles multiple diacritics in one word', () => {
    expect(removeAccents('aün')).toBe('aun')
    expect(removeAccents('niño')).toBe('nino')
    expect(removeAccents('pingüino')).toBe('pinguino')
  })

  it('returns input unchanged if no diacritics', () => {
    expect(removeAccents('hola')).toBe('hola')
    expect(removeAccents('cafe')).toBe('cafe')
  })

  it('handles empty string', () => {
    expect(removeAccents('')).toBe('')
  })

  it('handles already decomposed characters', () => {
    expect(removeAccents('é')).toBe('e')
    expect(removeAccents('ü')).toBe('u')
  })
})

describe('escapeRegExp', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegExp('hello.world')).toBe('hello\\.world')
    expect(escapeRegExp('a[b]c')).toBe('a\\[b\\]c')
    expect(escapeRegExp('x$y')).toBe('x\\$y')
  })

  it('escapes all special characters', () => {
    const specials = '.*+?^${}()|[\]\\'
    const result = escapeRegExp(specials)
    expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\')
  })

  it('returns normal string unchanged', () => {
    expect(escapeRegExp('hello')).toBe('hello')
    expect(escapeRegExp('tag123')).toBe('tag123')
  })
})

describe('isInsideCodeBlock', () => {
  it('returns true inside triple-backtick code blocks', () => {
    const text = 'Some `magia` text'
    expect(isInsideCodeBlock(text, text.indexOf('magia'))).toBe(true)
  })

  it('returns true inside triple-backtick blocks with language', () => {
    const text = '```javascript\nconst x = 1\n```\noutside'
    expect(isInsideCodeBlock(text, text.indexOf('const'))).toBe(true)
  })

  it('returns false after closing triple backtick', () => {
    const text = '```\ncode\n```\nNot code here'
    expect(isInsideCodeBlock(text, text.indexOf('Not'))).toBe(false)
  })

  it('returns false outside code blocks', () => {
    const text = 'Some text with magia inside'
    expect(isInsideCodeBlock(text, text.indexOf('magia'))).toBe(false)
  })

  it('returns true inside inline backticks', () => {
    const text = 'Use `magia` here'
    expect(isInsideCodeBlock(text, text.indexOf('magia'))).toBe(true)
  })

  it('returns true inside indented code (4 spaces)', () => {
    const text = '    indented code'
    expect(isInsideCodeBlock(text, text.indexOf('indented'))).toBe(true)
  })

  it('returns true inside indented code (tab)', () => {
    const text = '\tindented with tab'
    expect(isInsideCodeBlock(text, text.indexOf('indented'))).toBe(true)
  })

  it('returns false on line that is not indented', () => {
    const text = 'normal line\nnot indented'
    expect(isInsideCodeBlock(text, text.indexOf('not'))).toBe(false)
  })

  it('handles nested inline code markers', () => {
    const text = '`inline` then `more`'
    expect(isInsideCodeBlock(text, text.indexOf('inline'))).toBe(true)
    expect(isInsideCodeBlock(text, text.indexOf('more'))).toBe(true)
  })

  it('handles position at start of text', () => {
    const text = 'no code here'
    expect(isInsideCodeBlock(text, 0)).toBe(false)
  })

  it('handles position inside first line triple backtick', () => {
    const text = '```\ncode\n```'
    expect(isInsideCodeBlock(text, 1)).toBe(true)
  })

  it('handles alternating backticks correctly', () => {
    const text = '`` not quite code `` more text'
    const posInFirstBackticks = text.indexOf('not')
    expect(isInsideCodeBlock(text, posInFirstBackticks)).toBe(false)
  })
})

describe('findTagMatchesInText', () => {
  const standardTagIndex = {
    aina: 'lore/characters/Aina.md',
    lirio: 'lore/places/ciudad-principal.md',
    magia: 'lore/concepts/magia.md',
  }

  describe('word boundary matching', () => {
    it('matches at word start', () => {
      const matches = findTagMatchesInText('Aina es un personaje', standardTagIndex)
      expect(matches).toHaveLength(1)
      expect(matches[0].tag).toBe('aina')
    })

    it('matches at end of string', () => {
      const matches = findTagMatchesInText('el norte', standardTagIndex)
      expect(matches).toHaveLength(0)
    })

    it('does not match inside compound words (no word boundary)', () => {
      const tagIndex = { magia: 'lore/magia.md' }
      const matches = findTagMatchesInText('magiaoscura', tagIndex)
      expect(matches).toHaveLength(0)
    })

    it('matches when surrounded by punctuation', () => {
      const matches = findTagMatchesInText('¡Aina!', standardTagIndex)
      expect(matches).toHaveLength(1)
    })
  })

  describe('accent normalization', () => {
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

    it('returns original (non-normalized) tag in match result', () => {
      const accentIndex = { canción: 'lore/songs/cancion.md' }
      const matches = findTagMatchesInText('una canción bella', accentIndex)
      expect(matches).toHaveLength(1)
      expect(matches[0].tag).toBe('canción')
    })

    it('handles mixed accents in text and tag', () => {
      const accentIndex = { corazón: 'lore/heart/corazon.md' }
      expect(findTagMatchesInText('el corazón late', accentIndex)).toHaveLength(1)
      expect(findTagMatchesInText('el corazon late', accentIndex)).toHaveLength(1)
      expect(findTagMatchesInText('el CORAZON late', accentIndex)).toHaveLength(1)
    })
  })

  describe('case insensitivity', () => {
    it('matches uppercase tag in text', () => {
      const matches = findTagMatchesInText('MAGIA oscura', standardTagIndex)
      expect(matches).toHaveLength(1)
      expect(matches[0].tag).toBe('magia')
    })

    it('matches mixed case tag in text', () => {
      const matches = findTagMatchesInText('MaGiA es genial', standardTagIndex)
      expect(matches).toHaveLength(1)
    })
  })

  describe('overlap and longest-match resolution', () => {
    it('does not return overlapping matches', () => {
      const tagIndex = {
        norte: 'lore/directions/norte.md',
        'norte salvaje': 'lore/places/norte-salvaje.md',
      }
      const text = 'el norte salvaje'
      const matches = findTagMatchesInText(text, tagIndex)

      const NorteMatch = matches.find((m) => m.tag === 'norte')
      expect(NorteMatch).toBeUndefined()
    })

    it('longer tag wins when both could match same position', () => {
      const tagIndex = {
        norte: 'lore/directions/norte.md',
        'norte salvaje': 'lore/places/norte-salvaje.md',
      }
      const text = 'el norte salvaje'
      const matches = findTagMatchesInText(text, tagIndex)

      expect(matches).toHaveLength(1)
      expect(matches[0].tag).toBe('norte salvaje')
    })

    it('non-overlapping tags in same text both match', () => {
      const text = 'Aina y Lirio'
      const matches = findTagMatchesInText(text, standardTagIndex)
      expect(matches).toHaveLength(2)
      expect(matches.map((m) => m.tag).sort()).toEqual(['aina', 'lirio'])
    })

    it('handles three overlapping tags correctly', () => {
      const tagIndex = {
        a: 'a.md',
        ab: 'ab.md',
        abc: 'abc.md',
      }
      const matches = findTagMatchesInText('abc', tagIndex)
      expect(matches).toHaveLength(1)
      expect(matches[0].tag).toBe('abc')
    })
  })

  describe('positions and offsets', () => {
    it('returns correct start and end positions', () => {
      const text = 'Aina Lirio'
      const matches = findTagMatchesInText(text, standardTagIndex)
      const aina = matches.find((m) => m.tag === 'aina')!
      expect(aina.start).toBe(0)
      expect(aina.end).toBe(4)
    })

    it('positions are sorted by start ascending', () => {
      const text = 'Aina Lirio Magia'
      const matches = findTagMatchesInText(text, standardTagIndex)
      expect(matches[0].start).toBeLessThan(matches[1].start)
      expect(matches[1].start).toBeLessThan(matches[2].start)
    })

    it('positions reflect actual text, not normalized', () => {
      const text = 'canciónbella' // no space
      const tagIndex = { cancion: 'lore/songs/cancion.md' }
      const matches = findTagMatchesInText(text, tagIndex)
      expect(matches).toHaveLength(0) // no word boundary
    })
  })

  describe('filePath in match result', () => {
    it('returns correct filePath for matched tag', () => {
      const matches = findTagMatchesInText('Aina', standardTagIndex)
      expect(matches[0].filePath).toBe('lore/characters/Aina.md')
    })
  })

  describe('empty and edge cases', () => {
    it('returns empty array when text has no tags', () => {
      const text = 'hola mundo sin tags'
      expect(findTagMatchesInText(text, standardTagIndex)).toHaveLength(0)
    })

    it('returns empty array when tagIndex is empty', () => {
      const text = 'Aina Lirio'
      expect(findTagMatchesInText(text, {})).toHaveLength(0)
    })

    it('returns empty array when tagIndex is null-ish', () => {
      const text = 'Aina Lirio'
      expect(findTagMatchesInText(text, {})).toHaveLength(0)
    })

    it('handles empty text', () => {
      expect(findTagMatchesInText('', standardTagIndex)).toHaveLength(0)
    })

    it('handles whitespace-only text', () => {
      expect(findTagMatchesInText('   \n\t', standardTagIndex)).toHaveLength(0)
    })

    it('handles text with only whitespace between words', () => {
      const text = '   Aina   Lirio   '
      const matches = findTagMatchesInText(text, standardTagIndex)
      expect(matches).toHaveLength(2)
    })
  })

  describe('multiple occurrences of same tag', () => {
    it('matches multiple occurrences of same tag', () => {
      const text = 'Aina y Aina otra vez'
      const matches = findTagMatchesInText(text, standardTagIndex)
      expect(matches).toHaveLength(2)
      expect(matches[0].start).toBe(0)
      expect(matches[1].start).toBe(7)
    })
  })
})

describe('filterMatchesOutsideCode', () => {
  const tagIndex = {
    magia: 'lore/concepts/magia.md',
    aina: 'lore/characters/Aina.md',
  }

  it('filters matches inside triple-backtick code blocks', () => {
    // Properly formed triple backticks
    const text = '```\nmagia\n```\nmagia outside'
    const matches = findTagMatchesInText(text, tagIndex)
    const filtered = filterMatchesOutsideCode(text, matches)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].tag).toBe('magia')
    expect(filtered[0].start).toBe(text.indexOf('magia outside'))
  })

it('filters matches inside inline backticks', () => {
    const text = '`magia` inline'
    const matches = findTagMatchesInText(text, tagIndex)
    const filtered = filterMatchesOutsideCode(text, matches)
    expect(filtered).toHaveLength(0)
  })

  it('filters matches inside triple-backtick code blocks', () => {
    const text = '```\nmagia\n```'
    const matches = findTagMatchesInText(text, tagIndex)
    const filtered = filterMatchesOutsideCode(text, matches)
    expect(filtered).toHaveLength(0)
  })

  it('filters matches in indented code lines', () => {
    const text = '    magia indentado\nmagia libre'
    const matches = findTagMatchesInText(text, tagIndex)
    const filtered = filterMatchesOutsideCode(text, matches)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].tag).toBe('magia')
    expect(filtered[0].start).toBe(text.indexOf('magia libre'))
  })

  it('returns all matches when none are in code', () => {
    const text = 'magia y aina sin código'
    const matches = findTagMatchesInText(text, tagIndex)
    const filtered = filterMatchesOutsideCode(text, matches)
    expect(filtered).toHaveLength(2)
  })

  it('returns empty array when all matches are in code', () => {
    const text = '```\nmagia\naina\n```'
    const matches = findTagMatchesInText(text, tagIndex)
    const filtered = filterMatchesOutsideCode(text, matches)
    expect(filtered).toHaveLength(0)
  })
})