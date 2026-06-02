import { describe, expect, it } from 'vitest'
import { parseInlineMarkdownRuns, stripInlineMarkdown } from '../electron/services/book-export-inline-markdown'

describe('book export inline markdown', () => {
  it('parses underscore emphasis with spaces', () => {
    const runs = parseInlineMarkdownRuns('called _The Weight of Three_?')

    expect(runs).toEqual([
      { text: 'called ', bold: false, italic: false },
      { text: 'The Weight of Three', bold: false, italic: true },
      { text: '?', bold: false, italic: false },
    ])
  })

  it('parses asterisk emphasis and strong', () => {
    const runs = parseInlineMarkdownRuns('**bold** and *italic*')

    expect(runs).toEqual([
      { text: 'bold', bold: true, italic: false },
      { text: ' and ', bold: false, italic: false },
      { text: 'italic', bold: false, italic: true },
    ])
  })

  it('strips markup without leaving delimiter characters', () => {
    expect(stripInlineMarkdown('_The Weight of Three_')).toBe('The Weight of Three')
    expect(stripInlineMarkdown('## *Bold Title*')).toBe('Bold Title')
  })
})
