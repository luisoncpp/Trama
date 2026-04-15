import path from 'node:path'
import { AlignmentType, Document, ImageRun, Packer, Paragraph, TextRun } from 'docx'
import { parseDirectiveLine } from './book-export-directives.js'
import { loadImageBytes, resolveImagePath } from './book-export-image-utils.js'
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

const IMAGE_LINE_PATTERN = /^!\[([^\]]*)\]\(([^)]+)\)$/

async function chapterParagraphs(
  chapter: BookExportChapter,
  isLast: boolean,
  projectRoot: string,
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = []
  const chapterDir = path.dirname(chapter.path)

  let centered = false
  let lastWasPagebreak = false

  for (const line of chapter.content.split('\n')) {
    const directive = parseDirectiveLine(line)

    if (directive) {
      if (directive.kind === 'centerStart') {
        centered = true
        lastWasPagebreak = false
      } else if (directive.kind === 'centerEnd') {
        centered = false
        lastWasPagebreak = false
      } else if (directive.kind === 'pagebreak') {
        paragraphs.push(new Paragraph({ pageBreakBefore: true }))
        lastWasPagebreak = true
      } else if (directive.kind === 'spacer') {
        for (let index = 0; index < directive.lines; index += 1) {
          paragraphs.push(new Paragraph({ text: '' }))
        }
        lastWasPagebreak = false
      }
      continue
    }

    const imageMatch = line.trim().match(IMAGE_LINE_PATTERN)
    if (imageMatch) {
      const imagePath = imageMatch[2]
      const resolvedPath = await resolveImagePath(imagePath, projectRoot, chapterDir)
      const { bytes, type } = await loadImageBytes(resolvedPath)
      if (bytes && type) {
        try {
          paragraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: bytes,
                  type: type === 'png' ? 'png' : 'jpg',
                  transformation: { width: 500, height: 300 },
                }),
              ],
            }),
          )
        } catch (err) {
          console.warn(`Failed to embed image in DOCX: ${resolvedPath}`, err instanceof Error ? err.message : String(err))
        }
      }
      lastWasPagebreak = false
      continue
    }

    const text = stripInlineMarkdown(line)
    if (!text) {
      paragraphs.push(new Paragraph({ text: '' }))
      lastWasPagebreak = false
      continue
    }

    paragraphs.push(new Paragraph({
      children: [new TextRun(text)],
      alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    }))
    lastWasPagebreak = false
  }

  if (!isLast && !lastWasPagebreak) {
    paragraphs.push(new Paragraph({ text: '' }))
    paragraphs.push(new Paragraph({ text: '' }))
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
