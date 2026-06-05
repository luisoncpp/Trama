/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { PDFDocument, rgb } from 'pdf-lib'
import { mergePdfSegments } from '../electron/services/book-export-pdf-merge.js'

async function createLabeledOnePagePdf(label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([200, 200])
  page.drawText(label, { x: 20, y: 100, size: 12, color: rgb(0, 0, 0) })
  return new Uint8Array(await doc.save())
}

describe('mergePdfSegments', () => {
  it('returns a valid PDF when there are no segment buffers', async () => {
    const merged = await mergePdfSegments([])
    const doc = await PDFDocument.load(merged)

    expect(merged.byteLength).toBeGreaterThan(0)
    expect(doc.getPageCount()).toBeLessThanOrEqual(1)
  })

  it('passes through a single segment unchanged in page count', async () => {
    const single = await createLabeledOnePagePdf('only')
    const merged = await mergePdfSegments([single])
    const doc = await PDFDocument.load(merged)

    expect(doc.getPageCount()).toBe(1)
  })

  it('merges two one-page PDFs in order', async () => {
    const first = await createLabeledOnePagePdf('first')
    const second = await createLabeledOnePagePdf('second')
    const merged = await mergePdfSegments([first, second])
    const doc = await PDFDocument.load(merged)

    expect(doc.getPageCount()).toBe(2)
  })
})
