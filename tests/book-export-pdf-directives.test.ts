/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import {
  replaceDirectivesForPdfPrint,
  stripLeadingPagebreakAndBlankLines,
} from '../electron/services/book-export-directives.js'
import { normalizePdfPrintChapterBody } from '../electron/services/book-export-renderers.js'

const PAGEBREAK = '<!-- trama:pagebreak -->'

describe('PDF print directives', () => {
  it('omits pagebreak lines instead of rendering page-break HTML', () => {
    const output = replaceDirectivesForPdfPrint(
      ['Before', PAGEBREAK, 'After'].join('\n'),
    )

    expect(output).toContain('Before')
    expect(output).toContain('After')
    expect(output).not.toContain('trama-pagebreak')
    expect(output).not.toContain(PAGEBREAK)
  })

  it('unwraps standalone image paragraphs for print layout', () => {
    const output = normalizePdfPrintChapterBody(
      '<div class="trama-center"><p></p><p><img src="x.png" alt="cover"></p></div>',
    )

    expect(output).not.toContain('<p>')
    expect(output).toContain('<img src="x.png" alt="cover">')
  })

  it('strips leading blank lines and page breaks from chapter content', () => {
    const output = stripLeadingPagebreakAndBlankLines(
      ['', PAGEBREAK, '', 'Hello'].join('\n'),
    )

    expect(output).toBe('Hello')
  })
})
