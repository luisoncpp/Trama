import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  renderChapterHtmlFragmentForPdf,
  type BookExportMetadata,
} from './book-export-renderers.js'
import type { PdfExportSegment } from './book-export-pdf-segments.js'

const PRINT_CSS_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'book-export-pdf-print.css')

let cachedPrintCss: string | null = null

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function loadBookExportPrintCss(): Promise<string> {
  if (!cachedPrintCss) {
    cachedPrintCss = await readFile(PRINT_CSS_PATH, 'utf8')
  }

  return cachedPrintCss
}

/** Clears cached print CSS (tests only). */
export function clearBookExportPrintCssCacheForTests(): void {
  cachedPrintCss = null
}

async function renderSegmentChapterSections(
  segment: PdfExportSegment,
  projectRoot: string,
): Promise<string[]> {
  return Promise.all(
    segment.chapters.map((chapter) =>
      renderChapterHtmlFragmentForPdf(
        { path: chapter.path, title: '', content: chapter.content },
        projectRoot,
      ),
    ),
  )
}

function wrapPrintStyle(printCss: string): string {
  return ['<style>', printCss, '</style>'].join('\n')
}

function buildBookHeaderBlock(metadata: BookExportMetadata): string[] {
  const title = metadata.title?.trim() ?? ''
  const author = metadata.author?.trim() ?? ''

  if (!title && !author) {
    return []
  }

  const lines = ['  <header class="trama-header">']
  if (title) {
    lines.push(`    <h1>${escapeHtml(title)}</h1>`)
  }
  if (author) {
    lines.push(`    <p class="trama-byline">${escapeHtml(author)}</p>`)
  }
  lines.push('  </header>')
  return lines
}

function buildPrintDocument(
  printCss: string,
  metadata: BookExportMetadata,
  bodyLines: string[],
): string {
  const title = metadata.title?.trim() ?? ''
  const author = metadata.author?.trim() ?? ''
  const authorMeta = author ? `<meta name="author" content="${escapeHtml(author)}" />` : ''
  const documentTitle = title ? `<title>${escapeHtml(title)}</title>` : ''

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    documentTitle,
    authorMeta,
    wrapPrintStyle(printCss),
    '</head>',
    '<body>',
    ...bodyLines,
    '</body>',
    '</html>',
  ]
    .filter((line) => line.length > 0)
    .join('\n')
}

export async function renderSegmentPrintHtml(
  segment: PdfExportSegment,
  segmentIndex: number,
  metadata: BookExportMetadata,
  projectRoot = '',
): Promise<string> {
  const printCss = await loadBookExportPrintCss()
  const chapterSections = await renderSegmentChapterSections(segment, projectRoot)
  const bodyLines = [
    ...(segmentIndex === 0 ? buildBookHeaderBlock(metadata) : []),
    ...chapterSections.map((section) => `  ${section}`),
  ]

  return buildPrintDocument(printCss, segmentIndex === 0 ? metadata : {}, bodyLines)
}
