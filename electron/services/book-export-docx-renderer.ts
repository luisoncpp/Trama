import path from 'node:path'
import { AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx'
import { parseDirectiveLine } from './book-export-directives.js'
import { loadImageBytes, resolveImagePath, extractImageReferences, extractImageInfo, isReferenceDefinitionLine, getImageDimensions, calculateDocxImageSize } from './book-export-image-utils.js'
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

function handleDirective(dir: ReturnType<typeof parseDirectiveLine>, paragraphs: Paragraph[]): boolean {
  if (!dir) return false
  if (dir.kind === 'pagebreak') {
    paragraphs.push(new Paragraph({ pageBreakBefore: true }))
  } else if (dir.kind === 'spacer') {
    for (let i = 0; i < dir.lines; i += 1) {
      paragraphs.push(new Paragraph({ text: '' }))
    }
  }
  return true
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

function detectHeading(line: string): { text: string; level: 1 | 2 | 3 | 4 | 5 | 6 } | null {
  const match = line.match(/^(#{1,6})\/? ?(.*)$/)
  if (!match) return null
  return { level: match[1].length as 1 | 2 | 3 | 4 | 5 | 6, text: match[2].trim() }
}

function addSpacing(paragraphs: Paragraph[], count: number): void {
  for (let i = 0; i < count; i += 1) {
    paragraphs.push(new Paragraph({ text: '' }))
  }
}

async function processLine(
  line: string,
  centered: boolean,
  projectRoot: string,
  chapterDir: string,
  paragraphs: Paragraph[],
  references: Map<string, string>,
): Promise<{ centered: boolean; isPagebreak: boolean }> {
  const directive = parseDirectiveLine(line)
  if (directive) {
    if (directive.kind === 'centerStart') return { centered: true, isPagebreak: false }
    if (directive.kind === 'centerEnd') return { centered: false, isPagebreak: false }
    const handled = handleDirective(directive, paragraphs)
    return { centered, isPagebreak: handled && directive.kind === 'pagebreak' }
  }

  if (isReferenceDefinitionLine(line)) {
    return { centered, isPagebreak: false }
  }

  const imageInfo = extractImageInfo(line, references)
  if (imageInfo) {
    const resolvedPath = await resolveImagePath(imageInfo.source, projectRoot, chapterDir)
    const { bytes, type } = await loadImageBytes(resolvedPath)
    if (bytes && type) {
      try {
        paragraphs.push(createImageParagraph(bytes, type))
      } catch (err) {
        console.warn(`Failed to embed image in DOCX: ${resolvedPath}`, err instanceof Error ? err.message : String(err))
      }
    }
    return { centered, isPagebreak: false }
  }

  const heading = detectHeading(line)
  if (heading) {
    paragraphs.push(createHeadingParagraph(heading.text, heading.level, centered))
    return { centered, isPagebreak: false }
  }

  const text = stripInlineMarkdown(line)
  if (!text) {
    paragraphs.push(new Paragraph({ text: '' }))
    return { centered, isPagebreak: false }
  }

  paragraphs.push(createTextParagraph(text, centered))
  return { centered, isPagebreak: false }
}

async function chapterParagraphs(
  chapter: BookExportChapter,
  isLast: boolean,
  projectRoot: string,
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = []
  const chapterDir = path.dirname(chapter.path)
  const references = extractImageReferences(chapter.content)
  let centered = false
  let lastWasPagebreak = false

  for (const line of chapter.content.split('\n')) {
    const result = await processLine(line, centered, projectRoot, chapterDir, paragraphs, references)
    centered = result.centered
    lastWasPagebreak = result.isPagebreak
  }

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
