import path from 'node:path'
import type { BookExportChapter } from './book-export-renderers.js'
import { parseDirectiveLine } from './book-export-directives.js'
import { resolveImagePath, extractImageReferences, extractImageInfo, isReferenceDefinitionLine } from './book-export-image-utils.js'
import type { PdfWriter, PdfLayoutState } from './book-export-pdf-utils.js'

export async function renderPdfChapter(
  chapter: BookExportChapter,
  writer: PdfWriter,
  state: PdfLayoutState,
  projectRoot: string,
): Promise<boolean> {
  const chapterDir = path.dirname(chapter.path)
  const references = extractImageReferences(chapter.content)
  let lastWasPagebreak = false
  let lineIndex = 0
  for (const sourceLine of chapter.content.split('\n')) {
    lineIndex++;
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

    if (isReferenceDefinitionLine(sourceLine)) {
      continue
    }

    const imageInfo = extractImageInfo(sourceLine, references)
    if (imageInfo) {
      const resolvedPath = await resolveImagePath(imageInfo.source, projectRoot, chapterDir)
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
