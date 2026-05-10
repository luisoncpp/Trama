import path from 'node:path'
import type { BookExportChapter } from './book-export-renderers.js'
import { type BookExportDirective } from './book-export-directives.js'
import { resolveImagePath } from './book-export-image-utils.js'
import { processChapterContent, type ExtractedImageInfo, type ParagraphSegment } from './book-export-line-processor.js'
import type { PdfWriter, PdfLayoutState } from './book-export-pdf-utils.js'

function makePdfChapterCallbacks(
  writer: PdfWriter,
  state: PdfLayoutState,
  lastWasPagebreakRef: { current: boolean },
  chapterDir: string,
  projectRoot: string,
) {
  return {
    onDirective: (directive: BookExportDirective) => {
      if (directive.kind === 'pagebreak') {
        writer.addPage()
        lastWasPagebreakRef.current = true
      } else if (directive.kind === 'spacer') {
        writer.addSpacer(directive.lines)
      } else if (directive.kind === 'centerStart') {
        state.centered = true
      } else if (directive.kind === 'centerEnd') {
        state.centered = false
      }
    },
    onImage: async (imageInfo: ExtractedImageInfo) => {
      if (!imageInfo) return
      const resolvedPath = await resolveImagePath(imageInfo.source, projectRoot, chapterDir)
      await writer.drawImage(resolvedPath)
      lastWasPagebreakRef.current = false
    },
    onHeading: (level: number, text: string) => {
      writer.drawHeading(text, state.centered)
      lastWasPagebreakRef.current = false
    },
    onParagraph: (text: string) => {
      writer.drawParagraphLine(text, state.centered)
      lastWasPagebreakRef.current = false
    },
    onParagraphWithImages: async (segments: ParagraphSegment[]) => {
      for (const segment of segments) {
        if (segment.type === 'text') {
          writer.drawParagraphLine(segment.text, state.centered)
        } else if (segment.type === 'image') {
          const resolvedPath = await resolveImagePath(segment.imageInfo.source, projectRoot, chapterDir)
          await writer.drawImage(resolvedPath)
        }
      }
      lastWasPagebreakRef.current = false
    },
    onReferenceDefinition: () => {},
  }
}

export async function renderPdfChapter(
  chapter: BookExportChapter,
  writer: PdfWriter,
  state: PdfLayoutState,
  projectRoot: string,
): Promise<boolean> {
  const chapterDir = path.dirname(chapter.path)
  const lastWasPagebreakRef = { current: false }

  await processChapterContent(
    chapter.content,
    chapterDir,
    makePdfChapterCallbacks(writer, state, lastWasPagebreakRef, chapterDir, projectRoot),
  )

  return lastWasPagebreakRef.current
}
