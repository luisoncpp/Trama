import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { buildPdfExportSegments, segmentHasPrintableContent } from './book-export-pdf-segments.js'
import { renderSegmentPrintHtml } from './book-export-pdf-html.js'
import { mergePdfSegments } from './book-export-pdf-merge.js'
import {
  getBookExportPrintSurface,
  withBookExportTempDirectory,
} from './book-export-pdf-print.js'
import type { BookExportChapter, BookExportMetadata } from './book-export-renderers.js'

export async function renderPdfBook(
  chapters: BookExportChapter[],
  metadata: BookExportMetadata = {},
  projectRoot = '',
): Promise<Uint8Array> {
  const segments = buildPdfExportSegments(chapters)
  console.log(`[book-export] PDF export segment count: ${segments.length}`)

  if (segments.length === 0) {
    const empty = await PDFDocument.create()
    return new Uint8Array(await empty.save())
  }

  const segmentBuffers: Uint8Array[] = []
  const printSurface = getBookExportPrintSurface()

  await withBookExportTempDirectory(async (tempDirectory) => {
    let printableSegmentIndex = 0

    for (let index = 0; index < segments.length; index += 1) {
      if (!segmentHasPrintableContent(segments[index])) {
        continue
      }
      console.log("Exporting segment:", index);

      const html = await renderSegmentPrintHtml(
        segments[index],
        printableSegmentIndex,
        metadata,
        projectRoot,
      )
      const htmlPath = path.join(
        tempDirectory,
        `segment-${String(printableSegmentIndex).padStart(3, '0')}.html`,
      )
      await writeFile(htmlPath, html, 'utf8')

      const pdfBytes = await printSurface.printHtmlFileToPdf(path.resolve(htmlPath))
      segmentBuffers.push(pdfBytes)
      printableSegmentIndex += 1
    }
  })

  if (segmentBuffers.length === 0) {
    const empty = await PDFDocument.create()
    return new Uint8Array(await empty.save())
  }

  return mergePdfSegments(segmentBuffers)
}
