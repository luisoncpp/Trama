import { describe, expect, it } from 'vitest'
import { sanitizeForBookExport } from '../electron/services/book-export-sanitize'

describe('book export sanitize', () => {
  it('removes frontmatter and html comments for markdown output', () => {
    const source = [
      '---',
      'tags: [alpha, beta]',
      'title: Test',
      '---',
      '',
      '# Chapter',
      '',
      '<!-- trama:pagebreak -->',
      'Body line',
    ].join('\n')

    const output = sanitizeForBookExport(source, 'markdown')

    expect(output).toContain('# Chapter')
    expect(output).toContain('Body line')
    expect(output).not.toContain('tags: [alpha, beta]')
    expect(output).not.toContain('<!-- trama:pagebreak -->')
  })

  it('keeps html comments for non-markdown formats', () => {
    const source = [
      '---',
      'tags: [alpha, beta]',
      '---',
      '',
      '<!-- trama:pagebreak -->',
      'Body line',
    ].join('\n')

    const output = sanitizeForBookExport(source, 'html')

    expect(output).not.toContain('tags: [alpha, beta]')
    expect(output).toContain('<!-- trama:pagebreak -->')
  })

  it('normalizes windows line endings and trims trailing spaces', () => {
    const source = 'Line one  \r\nLine two\t\r\n'

    const output = sanitizeForBookExport(source, 'markdown')

    expect(output).toBe('Line one\nLine two')
  })
})
