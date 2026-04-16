import path from 'node:path'
import type { BookExportChapter } from './book-export-renderers.js'
import { parseDirectiveLine } from './book-export-directives.js'
import { resolveImagePath } from './book-export-image-utils.js'
import type { PdfWriter, PdfLayoutState } from './book-export-pdf-renderer.js'

export async function renderPdfChapter(
  chapter: BookExportChapter,
  writer: PdfWriter,
  state: PdfLayoutState,
  projectRoot: string,
): Promise<boolean> {
  const chapterDir = path.dirname(chapter.path)
  let lastWasPagebreak = false

  for (const sourceLine of chapter.content.split('\n')) {
    const directive = parseDirectiveLine(sourceLine)
    if (directive) {
      if (directive.kind === 'centerStart') {
        state.centered = true
        lastWasPagebreak = false
      } else if (directive.kind === 'centerEnd') {
        state.centered = false
        lastWasPagebreak = false
      } else if (directive.kind === 'pagebreak') {
        writer.addPage()
        lastWasPagebreak = true
      } else if (directive.kind === 'spacer') {
        writer.addSpacer(directive.lines)
        lastWasPagebreak = false
      }
      continue
    }

    const IMAGE_LINE_PATTERN = /^!\[([^\]]*)\]\(([^)]+)\)$/
    const imageMatch = sourceLine.trim().match(IMAGE_LINE_PATTERN)
    if (imageMatch) {
      const imagePath = imageMatch[2]
      const resolvedPath = await resolveImagePath(imagePath, projectRoot, chapterDir)
      await writer.drawImage(resolvedPath)
      lastWasPagebreak = false
      continue
    }

    const headingMatch = sourceLine.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      writer.drawHeading(headingMatch[2], state.centered)
      lastWasPagebreak = false
    } else {
      writer.drawParagraphLine(sourceLine, state.centered)
      lastWasPagebreak = false
    }
  }

  return lastWasPagebreak
}
