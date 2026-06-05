import { describe, expect, it } from 'vitest'
import { buildPdfExportSegments } from '../electron/services/book-export-pdf-segments.js'
import type { BookExportChapter } from '../electron/services/book-export-renderers.js'

function chapter(path: string, content: string): BookExportChapter {
  return { path, title: path, content }
}

const PAGEBREAK = '<!-- trama:pagebreak -->'

describe('buildPdfExportSegments', () => {
  it('returns no segments for an empty book', () => {
    expect(buildPdfExportSegments([])).toEqual([])
  })

  it('returns one segment for a single document without page breaks', () => {
    const segments = buildPdfExportSegments([chapter('book/a.md', 'Hello\n\nWorld')])

    expect(segments).toHaveLength(1)
    expect(segments[0].chapters).toEqual([
      { path: 'book/a.md', content: 'Hello\n\nWorld' },
    ])
    expect(segments[0].chapters[0].content).not.toContain(PAGEBREAK)
  })

  it('splits into three segments when two author page breaks are present', () => {
    const segments = buildPdfExportSegments([
      chapter('book/a.md', ['Before', PAGEBREAK, 'Middle', PAGEBREAK, 'After'].join('\n')),
    ])

    expect(segments).toHaveLength(3)
    expect(segments[0].chapters).toEqual([{ path: 'book/a.md', content: 'Before' }])
    expect(segments[1].chapters).toEqual([{ path: 'book/a.md', content: 'Middle' }])
    expect(segments[2].chapters).toEqual([{ path: 'book/a.md', content: 'After' }])
  })

  it('inserts an inter-document gap between two chapters without a trailing page break', () => {
    const segments = buildPdfExportSegments([
      chapter('book/01.md', 'First chapter'),
      chapter('book/02.md', 'Second chapter'),
    ])

    expect(segments).toHaveLength(1)
    expect(segments[0].chapters).toHaveLength(2)
    expect(segments[0].chapters[0]).toEqual({
      path: 'book/01.md',
      content: 'First chapter\n\n',
    })
    expect(segments[0].chapters[1]).toEqual({
      path: 'book/02.md',
      content: 'Second chapter',
    })
  })

  it('does not insert a gap before the next chapter when the prior chapter ended on a page break', () => {
    const segments = buildPdfExportSegments([
      chapter('book/01.md', ['End', PAGEBREAK].join('\n')),
      chapter('book/02.md', 'Start'),
    ])

    expect(segments).toHaveLength(2)
    expect(segments[0].chapters).toEqual([{ path: 'book/01.md', content: 'End' }])
    expect(segments[1].chapters).toEqual([{ path: 'book/02.md', content: 'Start' }])
    expect(segments[1].chapters[0].content).toBe('Start')
  })

  it('splits one chapter across segments when a page break appears mid-file', () => {
    const segments = buildPdfExportSegments([
      chapter('book/a.md', ['Part one', PAGEBREAK, 'Part two'].join('\n')),
    ])

    expect(segments).toHaveLength(2)
    expect(segments[0].chapters).toEqual([{ path: 'book/a.md', content: 'Part one' }])
    expect(segments[1].chapters).toEqual([{ path: 'book/a.md', content: 'Part two' }])
  })

  it('strips leading author page breaks before the first chapter body', () => {
    const segments = buildPdfExportSegments([
      chapter('book/a.md', [PAGEBREAK, 'Hello'].join('\n')),
    ])

    expect(segments).toHaveLength(1)
    expect(segments[0].chapters[0].content).toBe('Hello')
  })

  it('skips empty segments when consecutive page breaks create no body content', () => {
    const segments = buildPdfExportSegments([
      chapter('book/a.md', [PAGEBREAK, PAGEBREAK, 'After'].join('\n')),
    ])

    expect(segments).toHaveLength(1)
    expect(segments[0].chapters).toEqual([{ path: 'book/a.md', content: 'After' }])
  })

  it('recognizes HTML page break lines as segment boundaries', () => {
    const htmlPagebreak =
      '<div class="trama-pagebreak" data-trama-directive="pagebreak" contenteditable="false"></div>'
    const segments = buildPdfExportSegments([
      chapter('book/a.md', ['Alpha', htmlPagebreak, 'Beta'].join('\n')),
    ])

    expect(segments).toHaveLength(2)
    expect(segments[0].chapters[0].content).toBe('Alpha')
    expect(segments[1].chapters[0].content).toBe('Beta')
  })
})
