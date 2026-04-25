import path from 'node:path'
import { AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx'
import { type BookExportDirective } from './book-export-directives.js'
import { getImageDimensions, calculateDocxImageSize } from './book-export-image-utils.js'
import { resolveImagePath, loadImageBytes } from './book-export-image-utils.js'
import { processChapterContent } from './book-export-line-processor.js'
import type { BookExportChapter, BookExportMetadata } from './book-export-renderers.js'

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/g, '')
    .trim()
}

function createImageParagraph(bytes: Uint8Array, type: string): Paragraph {
  const docxType = type === 'png' ? 'png' : 'jpg'
  const dimensions = getImageDimensions(bytes, type === 'png' ? 'png' : 'jpeg')
  const size = dimensions
    ? calculateDocxImageSize(dimensions)
    : { width: 500, height: 300 }

  return new Paragraph({
    children: [
      new ImageRun({
        data: bytes,
        type: docxType,
        transformation: { width: size.width, height: size.height },
      }),
    ],
  })
}

function createTextParagraph(text: string, centered: boolean): Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
    alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
  })
}

function createHeadingParagraph(text: string, level: 1 | 2 | 3 | 4 | 5 | 6, centered: boolean): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
    heading: `Heading${level}` as 'Heading1' | 'Heading2' | 'Heading3' | 'Heading4' | 'Heading5' | 'Heading6',
    alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
  })
}

function addSpacing(paragraphs: Paragraph[], count: number): void {
  for (let i = 0; i < count; i += 1) {
    paragraphs.push(new Paragraph({ text: '' }))
  }
}

async function chapterParagraphs(
  chapter: BookExportChapter,
  isLast: boolean,
  projectRoot: string,
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = []
  const chapterDir = path.dirname(chapter.path)
  let centered = false
  let lastWasPagebreak = false

  await processChapterContent(
    chapter.content,
    chapterDir,
    {
      onDirective: (directive: BookExportDirective) => {
        if (directive.kind === 'pagebreak') {
          paragraphs.push(new Paragraph({ pageBreakBefore: true }))
          lastWasPagebreak = true
        } else if (directive.kind === 'spacer') {
          for (let i = 0; i < directive.lines; i += 1) {
            paragraphs.push(new Paragraph({ text: '' }))
          }
        } else if (directive.kind === 'centerStart') {
          centered = true
        } else if (directive.kind === 'centerEnd') {
          centered = false
        }
      },
      onImage: async (imageInfo, chapterDir) => {
        if (!imageInfo) return
        const resolvedPath = await resolveImagePath(imageInfo.source, projectRoot, chapterDir)
        const { bytes, type } = await loadImageBytes(resolvedPath)
        if (bytes && type) {
          try {
            paragraphs.push(createImageParagraph(bytes, type))
          } catch (err) {
            console.warn(`Failed to embed image in DOCX`, err instanceof Error ? err.message : String(err))
          }
        }
      },
      onHeading: (level: number, text: string) => {
        paragraphs.push(createHeadingParagraph(text, level as 1 | 2 | 3 | 4 | 5 | 6, centered))
      },
      onParagraph: (text: string) => {
        const stripped = stripInlineMarkdown(text)
        if (!stripped) {
          paragraphs.push(new Paragraph({ text: '' }))
          return
        }
        paragraphs.push(createTextParagraph(stripped, centered))
      },
      onReferenceDefinition: () => {},
    },
  )

  if (!isLast && !lastWasPagebreak) {
    addSpacing(paragraphs, 2)
  }

  return paragraphs
}

export async function renderDocxBook(
  chapters: BookExportChapter[],
  metadata: BookExportMetadata,
  projectRoot = '',
): Promise<Uint8Array> {
  const paragraphsByChapter = await Promise.all(
    chapters.map((chapter, index) => chapterParagraphs(chapter, index === chapters.length - 1, projectRoot)),
  )

  const sections = [
    {
      properties: {},
      children: paragraphsByChapter.flat(),
    },
  ]

  const document = new Document({
    title: metadata.title?.trim() || 'Trama Book Export',
    creator: metadata.author?.trim() || 'Trama',
    sections,
  })

  return Packer.toBuffer(document)
}
