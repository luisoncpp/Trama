import path from 'node:path'
import type { BookExportChapter } from './book-export-renderers.js'
import { type BookExportDirective } from './book-export-directives.js'
import { resolveImagePath } from './book-export-image-utils.js'
import { processChapterContent, type ExtractedImageInfo } from './book-export-line-processor.js'
import type { PdfWriter, PdfLayoutState } from './book-export-pdf-utils.js'

export async function renderPdfChapter(
  chapter: BookExportChapter,
  writer: PdfWriter,
  state: PdfLayoutState,
  projectRoot: string,
): Promise<boolean> {
  const chapterDir = path.dirname(chapter.path)
  let lastWasPagebreak = false

  const chapterLineCallbacks = {
    onDirective: (directive: BookExportDirective) => {
      if (directive.kind === 'pagebreak') {
        writer.addPage()
        lastWasPagebreak = true
      } else if (directive.kind === 'spacer') {
        writer.addSpacer(directive.lines)
      } else if (directive.kind === 'centerStart') {
        state.centered = true
      } else if (directive.kind === 'centerEnd') {
        state.centered = false
      }
    },
    onImage: async (imageInfo: ExtractedImageInfo, chapterDir: string) => {
      if (!imageInfo) return
      const resolvedPath = await resolveImagePath(imageInfo.source, projectRoot, chapterDir)
      await writer.drawImage(resolvedPath)
      lastWasPagebreak = false
    },
    onHeading: (level: number, text: string) => {
      writer.drawHeading(text, state.centered)
      lastWasPagebreak = false
    },
    onParagraph: (text: string) => {
      writer.drawParagraphLine(text, state.centered)
      lastWasPagebreak = false
    },
    onReferenceDefinition: () => {},
  }

  await processChapterContent(chapter.content, chapterDir, chapterLineCallbacks)

  return lastWasPagebreak
}
