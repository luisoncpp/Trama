/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import {
  renderMarkdownBook,
  renderHtmlBook,
  renderChapterHtmlFragment,
  type BookExportChapter,
} from '../electron/services/book-export-renderers'
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

function inlineFormattingChapter(): BookExportChapter {
  return {
    path: 'book/chapter-inline.md',
    title: 'Inline Formatting',
    content: [
      '## *Styled Title*',
      '',
      'He asked about _The Weight of Three_ again.',
      '',
      'Also **bold** and *italic* in one line.',
    ].join('\n'),
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

  it('renders html with em and strong for underscore and asterisk emphasis', async () => {
    const html = await renderHtmlBook([inlineFormattingChapter()], {
      title: 'Inline HTML Test',
      author: 'QA Team',
    })

    expect(html).toContain('<em>The Weight of Three</em>')
    expect(html).not.toMatch(/_The Weight of Three_/)
    expect(html).toMatch(/<h2>[\s\S]*<em>Styled Title<\/em>[\s\S]*<\/h2>/)
    expect(html).toContain('<strong>bold</strong>')
  })

  it('renders chapter html fragment with emphasis tags', async () => {
    const fragment = await renderChapterHtmlFragment(inlineFormattingChapter())

    expect(fragment).toContain('<em>The Weight of Three</em>')
    expect(fragment).not.toContain('_The Weight of Three_')
  })

  it('renders docx without raw emphasis markers for underscore and asterisk syntax', async () => {
    const docx = await renderDocxBook([inlineFormattingChapter()], {
      title: 'Inline DOCX Test',
      author: 'QA Team',
    })

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(docx)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('The Weight of Three')
    expect(documentXml).not.toContain('_The Weight of Three_')
    expect(documentXml).toContain('Styled Title')
    expect(documentXml).not.toMatch(/\*Styled Title\*/)
  })

  it('renders pdf for inline emphasis chapter', async () => {
    const pdf = await renderPdfBook([inlineFormattingChapter()])
    const doc = await PDFDocument.load(pdf)

    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    expect(pdf.byteLength).toBeGreaterThan(500)
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

  it('renders centered pdf headings inside center directives', async () => {
    const pdfBytes = await renderPdfBook([
      {
        path: 'book/chapter-centered-heading.md',
        title: 'Centered Heading',
        content: [
          '<!-- trama:center:start -->',
          '# Heading Centered',
          'Centered paragraph',
          '<!-- trama:center:end -->',
        ].join('\n'),
      },
    ])

    const doc = await PDFDocument.load(pdfBytes)
    expect(doc.getPageCount()).toBe(1)
    expect(pdfBytes.byteLength).toBeGreaterThan(0)
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

it('renders pdf with reference-style images', async () => {
    const fixture = await createProjectWithImageFixture()
    const pdfWithRefImages = await renderPdfBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Images',
        content: [
          'Texto antes',
          '![][pixel]',
          'Texto despues',
          '',
          `[pixel]: ${fixture.imageRelativeFromChapter}`,
        ].join('\n'),
      },
    ], fixture.projectRoot)

    const doc = await PDFDocument.load(pdfWithRefImages)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    expect(pdfWithRefImages.byteLength).toBeGreaterThan(100)
  })

  it('renders pdf with inline images inside a paragraph (text before and after image on same line)', async () => {
    const fixture = await createProjectWithImageFixture()
    const pdfWithInlineImages = await renderPdfBook([
      {
        path: 'book/Act-01/chapter-inline-images.md',
        title: 'Inline Images',
        content: [
          `Start text ![inline](${fixture.imageRelativeFromChapter}) end text`,
        ].join('\n'),
      },
    ], fixture.projectRoot)

    const doc = await PDFDocument.load(pdfWithInlineImages)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    expect(pdfWithInlineImages.byteLength).toBeGreaterThan(100)
  })

  it('renders pdf with multiple inline images on same line', async () => {
    const fixture = await createProjectWithImageFixture()
    const pdfWithMultipleInline = await renderPdfBook([
      {
        path: 'book/Act-01/chapter-multiple-inline.md',
        title: 'Multiple Inline',
        content: [
          `Before ![first](${fixture.imageRelativeFromChapter}) middle ![second](${fixture.imageRelativeFromChapter}) after`,
        ].join('\n'),
      },
    ], fixture.projectRoot)

    const doc = await PDFDocument.load(pdfWithMultipleInline)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    expect(pdfWithMultipleInline.byteLength).toBeGreaterThan(100)
  })

  it('renders pdf with project-root res images from nested chapters', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-book-res-images-'))
    const resDir = path.join(projectRoot, 'res')
    await mkdir(path.join(projectRoot, 'book', 'Act-01'), { recursive: true })
    await mkdir(resDir, { recursive: true })
    await writeFile(path.join(resDir, 'pixel.png'), Buffer.from(TINY_PNG_BASE64, 'base64'))

    const pdfWithResImage = await renderPdfBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Images',
        content: ['Texto', '![persisted](res/pixel.png)', 'Fin'].join('\n'),
      },
    ], projectRoot)

    const doc = await PDFDocument.load(pdfWithResImage)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    expect(pdfWithResImage.byteLength).toBeGreaterThan(100)
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

  it('renders docx with Heading1 style for h1 markdown', async () => {
    const docx = await renderDocxBook([
      {
        path: 'book/chapter-h1.md',
        title: 'H1 Chapter',
        content: '# Chapter One\n\nBody paragraph.\n\n## Subsection\n\nMore text.',
      },
    ], {
      title: 'Heading Test',
      author: 'QA Team',
    })

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(docx)
    const documentXml = await zip.file('word/document.xml')?.async('string')
    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('Chapter One')
    expect(documentXml).toMatch(/Heading1/)
  })

  it('renders docx with centered alignment for headings inside center directives', async () => {
    const docx = await renderDocxBook([
      {
        path: 'book/chapter-centered.md',
        title: 'Centered Chapter',
        content: [
          '<!-- trama:center:start -->',
          '# Centered Heading',
          'Centered body text',
          '<!-- trama:center:end -->',
          'Normal text after.',
        ].join('\n'),
      },
    ], {
      title: 'Centered Heading Test',
      author: 'QA Team',
    })

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(docx)
    const documentXml = await zip.file('word/document.xml')?.async('string')
    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('Centered Heading')
    expect(documentXml).toMatch(/jc.*center|w:jc.*w:val/)
  })

  it('renders docx with multiple heading levels', async () => {
    const docx = await renderDocxBook([
      {
        path: 'book/chapter-headings.md',
        title: 'Multi Level',
        content: [
          '# Title H1',
          '## Subtitle H2',
          '### Section H3',
          'Regular paragraph.',
          '# Another H1',
        ].join('\n'),
      },
    ], {
      title: 'Multi Heading Test',
      author: 'QA Team',
    })

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(docx)
    const documentXml = await zip.file('word/document.xml')?.async('string')
    expect(documentXml).toBeDefined()
    expect(documentXml).toMatch(/Heading1/)
    expect(documentXml).toMatch(/Heading2/)
    expect(documentXml).toMatch(/Heading3/)
  })

  it('renders docx with reference-style data-url images', async () => {
    const docx = await renderDocxBook([
      {
        path: 'book/chapter-images.md',
        title: 'Chapter Images',
        content: [
          'Texto antes',
          '![][image1]',
          'Texto despues',
          '',
          '[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==>',
        ].join('\n'),
      },
    ], {
      title: 'DOCX Ref Image Test',
      author: 'QA Team',
    })

    const docxBuffer = Buffer.from(docx)
    expect(docxBuffer.includes(Buffer.from('word/media/'))).toBe(true)

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(docx)
    const documentXml = await zip.file('word/document.xml')?.async('string')
    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('Texto antes')
    expect(documentXml).toContain('Texto despues')
    expect(documentXml).not.toContain('[image1]:')
  })

  it('renders docx with reference-style local images', async () => {
    const fixture = await createProjectWithImageFixture()
    const docx = await renderDocxBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Chapter Images',
        content: [
          'Texto',
          '![][pixel]',
          'Fin',
          '',
          `[pixel]: ${fixture.imageRelativeFromChapter}`,
        ].join('\n'),
      },
    ], {
      title: 'DOCX Ref Local Image Test',
      author: 'QA Team',
    }, fixture.projectRoot)

    const docxBuffer = Buffer.from(docx)
    expect(docxBuffer.includes(Buffer.from('word/media/'))).toBe(true)

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(docx)
    const documentXml = await zip.file('word/document.xml')?.async('string')
    expect(documentXml).toBeDefined()
    expect(documentXml).not.toContain('[pixel]:')
  })

  it('renders docx with inline images on same line as text', async () => {
    const fixture = await createProjectWithImageFixture()
    const docx = await renderDocxBook([
      {
        path: 'book/Act-01/chapter-inline.md',
        title: 'Inline Images',
        content: [
          `Start text ![inline](${fixture.imageRelativeFromChapter}) end text`,
        ].join('\n'),
      },
    ], {
      title: 'DOCX Inline Image Test',
      author: 'QA Team',
    }, fixture.projectRoot)

    const docxBuffer = Buffer.from(docx)
    expect(docxBuffer.includes(Buffer.from('word/media/'))).toBe(true)

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(docx)
    const documentXml = await zip.file('word/document.xml')?.async('string')
    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('Start text')
    expect(documentXml).toContain('end text')
  })

  it('renders docx with multiple inline images on same line', async () => {
    const fixture = await createProjectWithImageFixture()
    const docx = await renderDocxBook([
      {
        path: 'book/Act-01/chapter-multiple-inline.md',
        title: 'Multiple Inline',
        content: [
          `Before ![first](${fixture.imageRelativeFromChapter}) middle ![second](${fixture.imageRelativeFromChapter}) after`,
        ].join('\n'),
      },
    ], {
      title: 'DOCX Multiple Inline Test',
      author: 'QA Team',
    }, fixture.projectRoot)

    const docxBuffer = Buffer.from(docx)
    expect(docxBuffer.includes(Buffer.from('word/media/'))).toBe(true)

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(docx)
    const documentXml = await zip.file('word/document.xml')?.async('string')
    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('Before')
    expect(documentXml).toContain('after')
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

  it('renders epub with em tags for underscore emphasis', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'trama-epub-inline-'))
    const outputPath = path.join(tempDir, 'book-inline.epub')

    await renderEpubBook([inlineFormattingChapter()], { title: 'EPUB Inline Test', author: 'QA Team' }, outputPath)

    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await readFile(outputPath))
    const chapterEntry = Object.keys(zip.files).find((name) => name.endsWith('.xhtml') && !name.includes('toc'))
    expect(chapterEntry).toBeDefined()

    const chapterHtml = await zip.file(chapterEntry!)?.async('string')
    expect(chapterHtml).toBeDefined()
    expect(chapterHtml).toContain('<em>The Weight of Three</em>')
    expect(chapterHtml).not.toContain('_The Weight of Three_')
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

  it('renders epub when local images are inline inside a paragraph', async () => {
    const fixture = await createProjectWithImageFixture()
    const outputPath = path.join(fixture.projectRoot, 'book-inline-local-images.epub')

    await renderEpubBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Chapter Local Images',
        content: `Texto inicial ![local-image](${fixture.imageRelativeFromChapter}) texto final`,
      },
    ], { title: 'EPUB Inline Local Image Test', author: 'QA Team' }, outputPath, fixture.projectRoot)

    const epubBytes = await readFile(outputPath)
    expect(epubBytes.subarray(0, 2).toString()).toBe('PK')
    expect(epubBytes.includes(Buffer.from('OEBPS/images/'))).toBe(true)
  })

  it('renders epub when chapter contains reference-style data-url images', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'trama-epub-ref-image-'))
    const outputPath = path.join(tempDir, 'book-ref-images.epub')

    await renderEpubBook([
      {
        path: 'book/chapter-images.md',
        title: 'Chapter Images',
        content: [
          'Texto inicial',
          '![][ref1]',
          'Texto final',
          '',
          '[ref1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==>',
        ].join('\n'),
      },
    ], { title: 'EPUB Ref Image Test', author: 'QA Team' }, outputPath)

    const fileStats = await stat(outputPath)
    expect(fileStats.size).toBeGreaterThan(0)

    const epubBytes = await readFile(outputPath)
    expect(epubBytes.subarray(0, 2).toString()).toBe('PK')
    expect(epubBytes.includes(Buffer.from('OEBPS/images/'))).toBe(true)
  })

  it('renders epub when chapter contains reference-style local images', async () => {
    const fixture = await createProjectWithImageFixture()
    const outputPath = path.join(fixture.projectRoot, 'book-ref-local-images.epub')

    await renderEpubBook([
      {
        path: 'book/Act-01/chapter-images.md',
        title: 'Chapter Images',
        content: [
          'Texto inicial',
          '![][pixel]',
          'Texto final',
          '',
          `[pixel]: ${fixture.imageRelativeFromChapter}`,
        ].join('\n'),
      },
    ], { title: 'EPUB Ref Local Image Test', author: 'QA Team' }, outputPath, fixture.projectRoot)

    const fileStats = await stat(outputPath)
    expect(fileStats.size).toBeGreaterThan(0)

    const epubBytes = await readFile(outputPath)
    expect(epubBytes.subarray(0, 2).toString()).toBe('PK')
    expect(epubBytes.includes(Buffer.from('OEBPS/images/'))).toBe(true)
  })
})
