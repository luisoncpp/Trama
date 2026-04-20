import { describe, expect, it, vi } from 'vitest'
import { buildTagOverlayMatches } from '../src/features/project-editor/components/rich-markdown-editor-tag-overlay'
import { isInsideCodeBlock } from '../src/features/project-editor/components/rich-markdown-editor-tag-helpers'

describe('rich-markdown-editor-tag-overlay', () => {
  it('maps plain text offsets to Quill indexes when embeds exist before a tag', () => {
    const getBounds = vi.fn((left: number, width: number) => ({
      top: 0,
      left,
      width,
      height: 16,
    }))

    const editor = {
      getText: () => 'Aina y Lirio\n',
      getContents: () => ({
        ops: [
          { insert: { tramaDirective: 'pagebreak' } },
          { insert: 'Aina y Lirio\n' },
        ],
      }),
      getBounds,
    } as any

    const matches = buildTagOverlayMatches(editor, {
      aina: 'lore/characters/Aina.md',
      lirio: 'lore/places/ciudad-principal.md',
    })

    expect(matches).toHaveLength(2)
    expect(getBounds).toHaveBeenNthCalledWith(1, 1, 4)
    expect(getBounds).toHaveBeenNthCalledWith(2, 8, 5)
  })
})

describe('isInsideCodeBlock', () => {
  it('returns true inside triple-backtick code blocks', () => {
    const text = 'Some `magia` text'
    const pos = text.indexOf('magia')
    expect(isInsideCodeBlock(text, pos)).toBe(true)
  })

  it('returns true after closing triple backtick', () => {
    const text = '```\ncode\n```\nNot code'
    const pos = text.indexOf('Not')
    expect(isInsideCodeBlock(text, pos)).toBe(false)
  })

  it('returns false outside code blocks', () => {
    const text = 'Some text with magia inside'
    const pos = text.indexOf('magia')
    expect(isInsideCodeBlock(text, pos)).toBe(false)
  })

  it('returns true inside inline backticks', () => {
    const text = 'Use `magia` here'
    const pos = text.indexOf('magia')
    expect(isInsideCodeBlock(text, pos)).toBe(true)
  })

  it('returns true inside indented code', () => {
    const text = '    indented code'
    const pos = text.indexOf('indented')
    expect(isInsideCodeBlock(text, pos)).toBe(true)
  })

  it('handles nested inline code markers', () => {
    const text = '`inline` then `more`'
    expect(isInsideCodeBlock(text, text.indexOf('inline'))).toBe(true)
    expect(isInsideCodeBlock(text, text.indexOf('more'))).toBe(true)
  })
})
