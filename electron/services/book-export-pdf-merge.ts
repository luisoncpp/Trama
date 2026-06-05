import { PDFDocument } from 'pdf-lib'

export async function mergePdfSegments(buffers: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()

  for (const buffer of buffers) {
    const segmentDoc = await PDFDocument.load(buffer)
    const copiedPages = await merged.copyPages(segmentDoc, segmentDoc.getPageIndices())
    for (const page of copiedPages) {
      merged.addPage(page)
    }
  }

  return new Uint8Array(await merged.save())
}
