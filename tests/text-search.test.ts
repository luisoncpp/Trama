/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { countTextMatches, findTextMatches } from '../src/shared/text-search'

const insensitive = { caseSensitive: false, wholeWord: false }
const sensitive = { caseSensitive: true, wholeWord: false }
const wholeWord = { caseSensitive: false, wholeWord: true }

describe('text search matching', () => {
  it('finds case-insensitive matches by default', () => {
    expect(findTextMatches('Dragon dragon DRAGON', 'dragon', insensitive)).toEqual([0, 7, 14])
  })

  it('returns no matches for an empty or whitespace query', () => {
    expect(findTextMatches('anything', '', insensitive)).toEqual([])
    expect(findTextMatches('anything', '   ', insensitive)).toEqual([])
  })

  it('trims the query before matching', () => {
    expect(findTextMatches('a dragon sleeps', ' dragon ', insensitive)).toEqual([2])
  })

  it('respects case sensitivity when enabled', () => {
    expect(findTextMatches('Dragon dragon DRAGON', 'Dragon', sensitive)).toEqual([0])
    expect(findTextMatches('Dragon dragon DRAGON', 'dragon', sensitive)).toEqual([7])
  })

  it('matches whole words only when enabled', () => {
    expect(findTextMatches('cat catalog concat cat', 'cat', wholeWord)).toEqual([0, 19])
  })

  it('treats punctuation and line edges as word boundaries', () => {
    expect(findTextMatches('cat, (cat) cat.\ncat', 'cat', wholeWord)).toEqual([0, 6, 11, 16])
  })

  it('treats underscores and digits as word characters', () => {
    expect(findTextMatches('cat_1 cat1 _cat', 'cat', wholeWord)).toEqual([])
  })

  it('uses unicode-aware word boundaries for accented words', () => {
    expect(findTextMatches('el camión rojo', 'camión', wholeWord)).toEqual([3])
    expect(findTextMatches('anticamión', 'camión', wholeWord)).toEqual([])
    expect(findTextMatches('el niño y la niña', 'niño', wholeWord)).toEqual([3])
  })

  it('does not skip a valid match that overlaps a rejected partial match', () => {
    expect(findTextMatches('aaa aa', 'aa', wholeWord)).toEqual([4])
  })

  it('counts matches', () => {
    expect(countTextMatches('word word word', 'word', insensitive)).toBe(3)
    expect(countTextMatches('word word word', 'sword', insensitive)).toBe(0)
  })
})
