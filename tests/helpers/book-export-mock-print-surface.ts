import { PDFDocument } from 'pdf-lib'
import type { PrintSurface } from '../../electron/services/book-export-pdf-print.js'

/** One A4-ish page per segment HTML file — enough for merge/page-count tests in CI. */
export function createOnePagePdfMockPrintSurface(): PrintSurface {
  return {
    printHtmlFileToPdf: async () => {
      const doc = await PDFDocument.create()
      doc.addPage([595, 842])
      return new Uint8Array(await doc.save())
    },
  }
}
