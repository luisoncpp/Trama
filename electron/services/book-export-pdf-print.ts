import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { WebContents } from 'electron'

export interface PrintSurface {
  printHtmlFileToPdf(absoluteHtmlPath: string): Promise<Uint8Array>
}

let exclusiveQueue: Promise<void> = Promise.resolve()

export async function runBookExportPrintExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const task = exclusiveQueue.then(() => fn())
  exclusiveQueue = task.then(
    () => undefined,
    () => undefined,
  )
  return task
}

let testPrintSurface: PrintSurface | null = null
let defaultPrintSurface: ElectronBookExportPrintSurface | null = null

export function getBookExportPrintSurface(): PrintSurface {
  if (testPrintSurface) {
    return testPrintSurface
  }

  defaultPrintSurface ??= new ElectronBookExportPrintSurface()
  return defaultPrintSurface
}

export function setBookExportPrintSurfaceForTests(mock: PrintSurface | null): void {
  testPrintSurface = mock
}

export function disposeBookExportPrintSurface(): void {
  if (defaultPrintSurface) {
    defaultPrintSurface.dispose()
    defaultPrintSurface = null
  }
}

export async function withBookExportTempDirectory<T>(
  fn: (tempDirectory: string) => Promise<T>,
): Promise<T> {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'trama-book-export-'))
  try {
    return await fn(tempDirectory)
  } finally {
    await rm(tempDirectory, { recursive: true, force: true })
  }
}

async function loadSegmentHtmlForPrint(
  webContents: WebContents,
  absoluteHtmlPath: string,
): Promise<void> {
  try {
    await webContents.loadFile(absoluteHtmlPath)
  } catch (err) {
    const message = `Failed to load segment HTML: ${absoluteHtmlPath}`
    console.warn(`[book-export] ${message}`, err instanceof Error ? err.message : String(err))
    throw new Error(message)
  }

  await webContents.executeJavaScript(`
    (async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      })
    })()
  `)
}

class ElectronBookExportPrintSurface implements PrintSurface {
  private window: import('electron').BrowserWindow | null = null

  printHtmlFileToPdf(absoluteHtmlPath: string): Promise<Uint8Array> {
    return runBookExportPrintExclusive(() => this.printHtmlFileToPdfInternal(absoluteHtmlPath))
  }

  dispose(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy()
    }
    this.window = null
  }

  private async getOrCreateWindow(): Promise<import('electron').BrowserWindow> {
    const { BrowserWindow } = await import('electron')

    if (!this.window || this.window.isDestroyed()) {
      this.window = new BrowserWindow({
        show: false,
        skipTaskbar: true,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      })
      this.window.on('closed', () => {
        this.window = null
      })
    }

    return this.window
  }

  private async printHtmlFileToPdfInternal(absoluteHtmlPath: string): Promise<Uint8Array> {
    const win = await this.getOrCreateWindow()
    const { webContents } = win

    await loadSegmentHtmlForPrint(webContents, absoluteHtmlPath)

    try {
      // printToPDF margins are in inches (see Electron default 0.4), not CSS pixels.
      const pdfBuffer = await webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
      })
      return new Uint8Array(pdfBuffer)
    } catch (err) {
      console.error(
        `[book-export] printToPDF failed for ${absoluteHtmlPath}:`,
        err instanceof Error ? err.message : String(err),
      )
      throw err
    }
  }
}
