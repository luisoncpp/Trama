/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { buildPdfExportSegments } from '../electron/services/book-export-pdf-segments.js'
import {
  clearBookExportPrintCssCacheForTests,
  renderSegmentPrintHtml,
} from '../electron/services/book-export-pdf-html.js'
import type { BookExportChapter } from '../electron/services/book-export-renderers.js'

const PAGEBREAK = '<!-- trama:pagebreak -->'

function chapter(path: string, content: string): BookExportChapter {
  return { path, title: path, content }
}

describe('renderSegmentPrintHtml', () => {
  it('embeds Times New Roman print CSS and book header on segment 0', async () => {
    const segments = buildPdfExportSegments([
      chapter('book/a.md', '# Scene\n\nBody'),
    ])

    const html = await renderSegmentPrintHtml(segments[0], 0, {
      title: 'My Novel',
      author: 'Ada Author',
    })

    expect(html).toContain('"Times New Roman", Times, serif')
    expect(html).toContain('<header class="trama-header">')
    expect(html).toContain('<h1>My Novel</h1>')
    expect(html).toContain('<p class="trama-byline">Ada Author</p>')
    expect(html).toContain('class="trama-chapter"')
    expect(html).not.toContain(PAGEBREAK)
    expect(html).not.toContain('max-width: 760px')
  })

  it('omits book header and title h1 on segment 1+', async () => {
    const segments = buildPdfExportSegments([
      chapter('book/a.md', ['Before', PAGEBREAK, 'After'].join('\n')),
    ])

    const html = await renderSegmentPrintHtml(segments[1], 1, {
      title: 'My Novel',
      author: 'Ada Author',
    })

    expect(html).toContain('"Times New Roman", Times, serif')
    expect(html).not.toContain('<header class="trama-header">')
    expect(html).not.toContain('<h1>My Novel</h1>')
    expect(html).toContain('class="trama-chapter"')
    expect(html).not.toContain(PAGEBREAK)
  })

  it('renders layout directives as HTML artifacts, not raw pagebreak tokens', async () => {
    const segments = buildPdfExportSegments([
      chapter(
        'book/a.md',
        [
          '<!-- trama:center:start -->',
          'Centered',
          '<!-- trama:center:end -->',
          '<!-- trama:spacer lines=2 -->',
        ].join('\n'),
      ),
    ])

    const html = await renderSegmentPrintHtml(segments[0], 0, { title: 'T' })

    expect(html).toContain('class="trama-center"')
    expect(html).toContain('class="trama-spacer"')
    expect(html).not.toContain('<!-- trama:pagebreak -->')
  })

  it('omits the book header when title and author are empty', async () => {
    const segments = buildPdfExportSegments([chapter('book/a.md', '# Scene\n\nBody')])
    const html = await renderSegmentPrintHtml(segments[0], 0, {})

    expect(html).not.toContain('Trama Book Export')
    expect(html).not.toContain('<header class="trama-header">')
    expect(html).toContain('class="trama-chapter"')
  })

  it('loads print CSS from disk', async () => {
    clearBookExportPrintCssCacheForTests()
    const segments = buildPdfExportSegments([chapter('book/a.md', 'x')])
    const html = await renderSegmentPrintHtml(segments[0], 0, { title: 'T' })

    expect(html).toContain('"Times New Roman", Times, serif')
    expect(html).toContain('@page')
    expect(html).toContain('max-height: 26.17cm')
  })

  it('centers block images inside trama-center via auto margins in print CSS', async () => {
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const segments = buildPdfExportSegments([
      chapter(
        'book/cover.md',
        [
          '<!-- trama:center:start -->',
          '',
          `![cover](${tinyPng})`,
          '',
          '<!-- trama:center:end -->',
        ].join('\n'),
      ),
    ])

    const html = await renderSegmentPrintHtml(segments[0], 0, { title: 'T' })

    expect(html).toContain('class="trama-center"')
    expect(html).toMatch(/<div class="trama-center">[\s\S]*<img\b/)
    expect(html).toContain('.trama-center img')
    expect(html).toContain('margin-left: auto')
    expect(html).toContain('margin-right: auto')
  })
})
