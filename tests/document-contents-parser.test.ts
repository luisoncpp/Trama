import { describe, expect, it } from 'vitest'
import { parseDocumentHeadings } from '../src/features/project-editor/document-contents'

describe('document contents parser', () => {
  it('extracts H1-H3 headings in document order with sequential 0-based ordinals', () => {
    const markdown = ['# Part One', 'Some text', '## Chapter 1', '### Scene A', '## Chapter 2'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([
      { type: 'heading', level: 1, text: 'Part One', ordinal: 0 },
      { type: 'heading', level: 2, text: 'Chapter 1', ordinal: 1 },
      { type: 'heading', level: 3, text: 'Scene A', ordinal: 2 },
      { type: 'heading', level: 2, text: 'Chapter 2', ordinal: 3 },
    ])
  })

  it('ignores headings deeper than H3', () => {
    const markdown = ['#### Deep', '## Shallow', '##### Deeper'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([{ type: 'heading', level: 2, text: 'Shallow', ordinal: 0 }])
  })

  it('rejects markers without a space after the hashes', () => {
    const markdown = ['#nospace', '##alsonot', '# Real'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([{ type: 'heading', level: 1, text: 'Real', ordinal: 0 }])
  })

  it('excludes YAML frontmatter from extraction', () => {
    const markdown = ['---', 'id: doc-1', 'summary: # Not a heading', '---', '', '# Actual'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([{ type: 'heading', level: 1, text: 'Actual', ordinal: 0 }])
  })

  it('treats a leading --- block without closing delimiter as regular content', () => {
    const markdown = ['---', 'title: unfinished', '# Heading'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([{ type: 'heading', level: 1, text: 'Heading', ordinal: 0 }])
  })

  it('does not treat --- blocks past the first line as frontmatter', () => {
    const markdown = ['# Top', '---', '# Bottom'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([
      { type: 'heading', level: 1, text: 'Top', ordinal: 0 },
      { type: 'heading', level: 1, text: 'Bottom', ordinal: 1 },
    ])
  })

  it('ignores headings inside backtick and tilde fences, including info strings', () => {
    const markdown = [
      '# Before',
      '```markdown',
      '# inside code',
      '```',
      '~~~js',
      '## also inside',
      '~~~',
      '## After',
    ].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([
      { type: 'heading', level: 1, text: 'Before', ordinal: 0 },
      { type: 'heading', level: 2, text: 'After', ordinal: 1 },
    ])
  })

  it('requires a closing fence of the same char and at least the opening length', () => {
    const markdown = ['````', '```', '# still code', '````', '# after'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([{ type: 'heading', level: 1, text: 'after', ordinal: 0 }])
  })

  it('treats the rest of the document as code after an unclosed fence', () => {
    const markdown = ['# Visible', '```', '# hidden', '## also hidden'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([{ type: 'heading', level: 1, text: 'Visible', ordinal: 0 }])
  })

  it('strips closing hashes from closed ATX headings', () => {
    expect(parseDocumentHeadings('## Title ##')).toEqual([{ type: 'heading', level: 2, text: 'Title', ordinal: 0 }])
    expect(parseDocumentHeadings('# C# course')).toEqual([{ type: 'heading', level: 1, text: 'C# course', ordinal: 0 }])
  })

  it('strips inline formatting markers from display text', () => {
    expect(parseDocumentHeadings('## **Bold** _title_ with `code` and ~~strike~~')).toEqual([
      { type: 'heading', level: 2, text: 'Bold title with code and strike', ordinal: 0 },
    ])
  })

  it('omits headings whose text is empty after stripping', () => {
    const markdown = ['# ', '## ** **', '### ###', '# Kept'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([{ type: 'heading', level: 1, text: 'Kept', ordinal: 0 }])
  })

  it('keeps duplicate texts as independently addressable entries', () => {
    const markdown = ['## Repeat', '## Repeat', '## Repeat'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([
      { type: 'heading', level: 2, text: 'Repeat', ordinal: 0 },
      { type: 'heading', level: 2, text: 'Repeat', ordinal: 1 },
      { type: 'heading', level: 2, text: 'Repeat', ordinal: 2 },
    ])
  })

  it('handles CRLF line endings', () => {
    expect(parseDocumentHeadings('# One\r\n## Two\r\n')).toEqual([
      { type: 'heading', level: 1, text: 'One', ordinal: 0 },
      { type: 'heading', level: 2, text: 'Two', ordinal: 1 },
    ])
  })

  it('returns an empty list for empty or heading-less documents', () => {
    expect(parseDocumentHeadings('')).toEqual([])
    expect(parseDocumentHeadings('Just prose.\nMore prose.')).toEqual([])
  })

  it('extracts page breaks and spacers by default in document order', () => {
    const markdown = [
      '# Intro',
      '<!-- trama:pagebreak -->',
      '## Chapter 1',
      '<!-- trama:spacer lines=3 -->',
      '## Chapter 2',
    ].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([
      { type: 'heading', level: 1, text: 'Intro', ordinal: 0 },
      { type: 'pagebreak', level: 1, text: 'Page Break', ordinal: 1 },
      { type: 'heading', level: 2, text: 'Chapter 1', ordinal: 2 },
      { type: 'spacer', level: 1, lines: 3, text: 'Spacer (3 lines)', ordinal: 3 },
      { type: 'heading', level: 2, text: 'Chapter 2', ordinal: 4 },
    ])
  })

  it('uses directive labels in place of generic page-break and spacer text', () => {
    const markdown = [
      '<!-- trama:pagebreak label="Part II" -->',
      '<!-- trama:spacer lines=3 label="Scene transition" -->',
    ].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([
      { type: 'pagebreak', level: 1, label: 'Part II', text: 'Part II', ordinal: 0 },
      { type: 'spacer', level: 1, lines: 3, label: 'Scene transition', text: 'Scene transition', ordinal: 1 },
    ])
  })

  it('extracts consecutive blank lines as spacers', () => {
    const markdown = ['# First', 'Some text', '', '', '## Second'].join('\n')

    expect(parseDocumentHeadings(markdown)).toEqual([
      { type: 'heading', level: 1, text: 'First', ordinal: 0 },
      { type: 'spacer', level: 1, lines: 2, text: 'Spacer (2 lines)', ordinal: 1 },
      { type: 'heading', level: 2, text: 'Second', ordinal: 2 },
    ])
  })

  it('respects filter options to disable page breaks or spacers', () => {
    const markdown = [
      '# Intro',
      '<!-- trama:pagebreak -->',
      '<!-- trama:spacer lines=2 -->',
      '## Chapter 1',
    ].join('\n')

    expect(parseDocumentHeadings(markdown, { includePageBreaks: false })).toEqual([
      { type: 'heading', level: 1, text: 'Intro', ordinal: 0 },
      { type: 'spacer', level: 1, lines: 2, text: 'Spacer (2 lines)', ordinal: 2 },
      { type: 'heading', level: 2, text: 'Chapter 1', ordinal: 3 },
    ])

    expect(parseDocumentHeadings(markdown, { includeSpacers: false })).toEqual([
      { type: 'heading', level: 1, text: 'Intro', ordinal: 0 },
      { type: 'pagebreak', level: 1, text: 'Page Break', ordinal: 1 },
      { type: 'heading', level: 2, text: 'Chapter 1', ordinal: 3 },
    ])
  })
})
