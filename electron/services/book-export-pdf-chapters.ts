import path from 'node:path'
import type { BookExportChapter } from './book-export-renderers.js'
import { parseDirectiveLine } from './book-export-directives.js'
import { resolveImagePath } from './book-export-image-utils.js'
import type { PdfWriter, PdfLayoutState } from './book-export-pdf-utils.js'

export async function renderPdfChapter(
  chapter: BookExportChapter,
  writer: PdfWriter,
  state: PdfLayoutState,
  projectRoot: string,
): Promise<boolean> {
  const chapterDir = path.dirname(chapter.path)
  let lastWasPagebreak = false
  let lineIndex = 0
  for (const sourceLine of chapter.content.split('\n')) {
    lineIndex++;
    console.log(`Processing line ${lineIndex}:`, sourceLine)
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
    console.log(`Rendering line ${lineIndex} with centered=${state.centered}:`, sourceLine);

    const IMAGE_LINE_PATTERN = /^!\[([^\]]*)\]\(([^)]+)\)$/
    const imageMatch = sourceLine.trim().match(IMAGE_LINE_PATTERN)
    if (imageMatch) {
      const imagePath = imageMatch[2]
      const resolvedPath = await resolveImagePath(imagePath, projectRoot, chapterDir)
      console.log(`Rendering image line ${lineIndex}:`, resolvedPath)
      await writer.drawImage(resolvedPath)
      lastWasPagebreak = false
      continue
    }
    console.log(`Rendering text line ${lineIndex}:`, sourceLine)
    const headingMatch = sourceLine.match(/^(#{1,6})\s+(.+)$/)
    console.log(`Heading match for line ${lineIndex}:`, headingMatch ? `Found heading level ${headingMatch[1].length}` : 'No heading')
    if (headingMatch) {
      writer.drawHeading(headingMatch[2], state.centered)
      lastWasPagebreak = false
    } else {
      writer.drawParagraphLine(sourceLine, state.centered)
      lastWasPagebreak = false
    }
    console.log(`Finished rendering line ${lineIndex}`) 
  }

  return lastWasPagebreak
}
