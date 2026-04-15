/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { renderMarkdownBook, renderHtmlBook, type BookExportChapter } from '../electron/services/book-export-renderers'
import { renderDocxBook } from '../electron/services/book-export-docx-renderer'
import { renderEpubBook } from '../electron/services/book-export-epub-renderer'
import { renderPdfBook } from '../electron/services/book-export-pdf-renderer'

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`

async function createProjectWithImageFixture(): Promise<{ projectRoot: string; imageRelativeFromChapter: string }> {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-book-images-'))
  const chapterDir = path.join(projectRoot, 'book', 'Act-01')
  const imageDir = path.join(projectRoot, 'book', 'assets')
  await mkdir(chapterDir, { recursive: true })
  await mkdir(imageDir, { recursive: true })
  await writeFile(path.join(imageDir, 'pixel.png'), Buffer.from(TINY_PNG_BASE64, 'base64'))

  return {
    projectRoot,
    imageRelativeFromChapter: '../assets/pixel.png',
  }
}

function sampleChapters(): BookExportChapter[] {
  return [
    {
      path: 'book/chapter-01.md',
      title: 'Chapter 01',
      content: [
        '# Chapter 1',
        '',
        '<!-- trama:center:start -->',
        'Centered line',
        '<!-- trama:center:end -->',
        '<!-- trama:spacer lines=2 -->',
        '<!-- trama:pagebreak -->',
        'Body text',
      ].join('\n'),
    },
    {
      path: 'book/chapter-02.md',
      title: 'Chapter 02',
      content: '# Chapter 2\n\nSecond chapter.',
    },
  ]
}

describe('book export renderers', () => {
  it('renders markdown manuscript with chapter separators', () => {
    const markdown = renderMarkdownBook(sampleChapters())

    expect(markdown).toContain('---')
    expect(markdown).toContain('# Chapter 1')
    expect(markdown).toContain('# Chapter 2')
  })

  it('renders html with directive conversion and metadata', async () => {
    const html = await renderHtmlBook(sampleChapters(), {
      title: 'Renderer Test',
      author: 'QA Team',
    })

    expect(html).toContain('<title>Renderer Test</title>')
    expect(html).toContain('meta name="author" content="QA Team"')
    expect(html).toContain('trama-pagebreak')
    expect(html).toContain('trama-center')
  })

  it('renders html with local markdown images converted to data urls', async () => {
    const fixture = await createProjectWithImageFixture()
    const html = await renderHtmlBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Chapter Images',
        content: ['Texto', `![local](${fixture.imageRelativeFromChapter})`].join('\n'),
      },
    ], {
      title: 'Renderer HTML Image Test',
      author: 'QA Team',
    }, fixture.projectRoot)

    expect(html).toContain('<img')
    expect(html).toContain('src="data:image/png;base64,')
  })

  it('renders docx and pdf as non-empty binary outputs', async () => {
    const docx = await renderDocxBook(sampleChapters(), {
      title: 'Binary Test',
      author: 'QA Team',
    })
    const pdf = await renderPdfBook(sampleChapters())

    expect(docx.byteLength).toBeGreaterThan(0)
    expect(pdf.byteLength).toBeGreaterThan(0)
  })

  it('renders pdf with unicode and respects pagebreak directives', async () => {
    const commentDirectivePdf = await renderPdfBook([
      {
        path: 'book/chapter-unicode.md',
        title: 'Chapter Unicode',
        content: ['Inicio con **negritas** y acento ś', '<!-- trama:pagebreak -->', 'Segunda pagina'].join('\n'),
      },
    ])

    const commentDirectiveDoc = await PDFDocument.load(commentDirectivePdf)
    expect(commentDirectiveDoc.getPageCount()).toBe(2)

    const htmlDirectivePdf = await renderPdfBook([
      {
        path: 'book/chapter-html-pagebreak.md',
        title: 'Chapter HTML Pagebreak',
        content: ['Antes', '<div class="trama-pagebreak" aria-hidden="true"></div>', 'Despues'].join('\n'),
      },
    ])

    const htmlDirectiveDoc = await PDFDocument.load(htmlDirectivePdf)
    expect(htmlDirectiveDoc.getPageCount()).toBe(2)
  })

  it('renders pdf with embedded images (data url and local files)', async () => {
    const fixture = await createProjectWithImageFixture()
    const pdfWithImages = await renderPdfBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Images',
        content: [
          'Image in markdown:',
          `![inline](${TINY_PNG_DATA_URL})`,
          `![local](${fixture.imageRelativeFromChapter})`,
          'More text after image',
          '<!-- trama:pagebreak -->',
          'Next page',
        ].join('\n'),
      },
    ], fixture.projectRoot)

    const doc = await PDFDocument.load(pdfWithImages)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    expect(pdfWithImages.byteLength).toBeGreaterThan(100)
  })

  it('renders docx with embedded local images', async () => {
    const fixture = await createProjectWithImageFixture()
    const docx = await renderDocxBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Chapter Images',
        content: ['Texto', `![local](${fixture.imageRelativeFromChapter})`, 'Fin'].join('\n'),
      },
    ], {
      title: 'DOCX Image Test',
      author: 'QA Team',
    }, fixture.projectRoot)

    const docxBuffer = Buffer.from(docx)
    expect(docxBuffer.includes(Buffer.from('word/media/'))).toBe(true)
  })

  it('renders epub file to disk', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'trama-epub-renderer-'))
    const outputPath = path.join(tempDir, 'book.epub')

    await renderEpubBook(sampleChapters(), { title: 'EPUB Test', author: 'QA Team' }, outputPath)

    const fileStats = await stat(outputPath)
    expect(fileStats.size).toBeGreaterThan(0)

    const signature = await readFile(outputPath)
    expect(signature.subarray(0, 2).toString()).toBe('PK')
  })

  it('renders epub when chapter contains data-url images', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'trama-epub-image-renderer-'))
    const outputPath = path.join(tempDir, 'book-with-images.epub')

    await renderEpubBook([
      {
        path: 'book/chapter-images.md',
        title: 'Chapter Images',
        content: ['Texto inicial', `![inline-image](${TINY_PNG_DATA_URL})`, 'Texto final'].join('\n'),
      },
    ], { title: 'EPUB Image Test', author: 'QA Team' }, outputPath)

    const fileStats = await stat(outputPath)
    expect(fileStats.size).toBeGreaterThan(0)

    const signature = await readFile(outputPath)
    expect(signature.subarray(0, 2).toString()).toBe('PK')
  })

  it('renders epub when chapter contains local images', async () => {
    const fixture = await createProjectWithImageFixture()
    const outputPath = path.join(fixture.projectRoot, 'book-local-images.epub')

    await renderEpubBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Chapter Local Images',
        content: ['Texto inicial', `![local-image](${fixture.imageRelativeFromChapter})`, 'Texto final'].join('\n'),
      },
    ], { title: 'EPUB Local Image Test', author: 'QA Team' }, outputPath, fixture.projectRoot)

    const fileStats = await stat(outputPath)
    expect(fileStats.size).toBeGreaterThan(0)

    const epubBytes = await readFile(outputPath)
    expect(epubBytes.subarray(0, 2).toString()).toBe('PK')
    expect(epubBytes.includes(Buffer.from('OEBPS/images/'))).toBe(true)
  })
})
