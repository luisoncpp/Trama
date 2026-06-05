/** @vitest-environment node */

import { access, writeFile } from 'node:fs/promises'
import { describe, expect, it, afterEach } from 'vitest'
import path from 'node:path'
import {
  disposeBookExportPrintSurface,
  getBookExportPrintSurface,
  runBookExportPrintExclusive,
  setBookExportPrintSurfaceForTests,
  withBookExportTempDirectory,
} from '../electron/services/book-export-pdf-print.js'

afterEach(() => {
  setBookExportPrintSurfaceForTests(null)
})

describe('book export print surface', () => {
  it('forwards absolute HTML paths to an injected mock surface', async () => {
    const receivedPaths: string[] = []
    setBookExportPrintSurfaceForTests({
      printHtmlFileToPdf: async (absoluteHtmlPath) => {
        receivedPaths.push(absoluteHtmlPath)
        return new Uint8Array([0x25, 0x50, 0x44, 0x46])
      },
    })

    const bytes = await getBookExportPrintSurface().printHtmlFileToPdf('C:\\tmp\\segment-000.html')

    expect(receivedPaths).toEqual(['C:\\tmp\\segment-000.html'])
    expect(bytes).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
  })

  it('serializes exclusive print jobs through runBookExportPrintExclusive', async () => {
    let active = 0
    let maxActive = 0
    const completionOrder: number[] = []

    const jobs = [1, 2, 3].map(
      (id) => () =>
        runBookExportPrintExclusive(async () => {
          active += 1
          maxActive = Math.max(maxActive, active)
          await new Promise((resolve) => {
            setTimeout(resolve, 30)
          })
          active -= 1
          completionOrder.push(id)
        }),
    )

    await Promise.all(jobs.map((job) => job()))

    expect(maxActive).toBe(1)
    expect(completionOrder).toEqual([1, 2, 3])
  })

  it('removes the temp directory after withBookExportTempDirectory completes', async () => {
    let tempDirectory = ''

    await withBookExportTempDirectory(async (dir) => {
      tempDirectory = dir
      await writeFile(path.join(dir, 'segment-000.html'), '<html></html>', 'utf8')
      return dir
    })

    await expect(access(tempDirectory)).rejects.toThrow()
  })

  it('disposeBookExportPrintSurface is safe to call when no default surface exists', () => {
    expect(() => disposeBookExportPrintSurface()).not.toThrow()
    expect(() => disposeBookExportPrintSurface()).not.toThrow()
  })

  it('disposeBookExportPrintSurface does not clear an installed test surface', async () => {
    let callCount = 0
    setBookExportPrintSurfaceForTests({
      printHtmlFileToPdf: async () => {
        callCount += 1
        return new Uint8Array([0x25, 0x50, 0x44, 0x46])
      },
    })

    disposeBookExportPrintSurface()
    await getBookExportPrintSurface().printHtmlFileToPdf('C:\\tmp\\segment-000.html')

    expect(callCount).toBe(1)
  })
})
