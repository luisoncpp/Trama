import { PDFDocument, rgb } from 'pdf-lib'
import { loadPdfFonts } from './book-export-pdf-fonts.js'
import { inlineTokens, measureTokenLine, type PdfTextToken, wrapTokens } from './book-export-pdf-inline.js'
import { loadImageBytes } from './book-export-image-utils.js'
import type { BookExportChapter } from './book-export-renderers.js'
import { renderPdfChapter } from './book-export-pdf-chapters.js'

export interface PdfLayoutState {
  cursorY: number
  centered: boolean
}

export interface PdfWriter {
  addPage: () => void
  drawHeading: (text: string) => void
  drawParagraphLine: (text: string, centered: boolean) => void
  addSpacer: (lines: number) => void
  drawImage: (absolutePath: string) => Promise<void>
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 50
const BODY_FONT_SIZE = 12
const HEADING_FONT_SIZE = 17
const LINE_HEIGHT = 18

interface PdfPageContext {
  page: ReturnType<PDFDocument['addPage']>
}

function normalizeForFont(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
}

function safeTextForFont(text: string, font: { encodeText: (value: string) => unknown }): string {
  try {
    font.encodeText(text)
    return text
  } catch {
    const normalized = normalizeForFont(text)
    try {
      font.encodeText(normalized)
      return normalized
    } catch {
      return normalized.replace(/[^\x20-\x7E]/g, '?')
    }
  }
}

function normalizeRunsForFonts(runs: PdfTextToken[], regular: { encodeText: (value: string) => unknown }, bold: { encodeText: (value: string) => unknown }): PdfTextToken[] {
  const normalizedRuns: PdfTextToken[] = []
  for (const run of runs) {
    const font = run.bold ? bold : regular
    const safeText = safeTextForFont(run.text, font)
    if (safeText.trim()) {
      normalizedRuns.push({ ...run, text: safeText })
    }
  }
  return normalizedRuns
}

function drawWrappedParagraph(text: string, centered: boolean, drawLine: (line: PdfTextToken[], centered: boolean) => void, state: PdfLayoutState, measure: (line: PdfTextToken[]) => number) {
  const lines = wrapTokens(inlineTokens(text), PAGE_WIDTH - MARGIN * 2, measure)
  if (lines.length === 0) {
    state.cursorY -= LINE_HEIGHT
    return
  }

  for (const line of lines) {
    drawLine(line, centered)
  }
}

function resetCursor(state: PdfLayoutState) {
  state.cursorY = PAGE_HEIGHT - MARGIN
}

function addPage(pdf: PDFDocument, state: PdfLayoutState, context: PdfPageContext) {
  context.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  resetCursor(state)
}

function ensureLineCapacity(pdf: PDFDocument, state: PdfLayoutState, context: PdfPageContext) {
  if (state.cursorY > MARGIN) {
    return
  }

  addPage(pdf, state, context)
}

function drawRuns(
  runs: PdfTextToken[],
  centered: boolean,
  pdf: PDFDocument,
  state: PdfLayoutState,
  context: PdfPageContext,
  writerFonts: Awaited<ReturnType<typeof loadPdfFonts>>,
) {
  ensureLineCapacity(pdf, state, context)
  const { regular, bold } = writerFonts
  const normalizedRuns = normalizeRunsForFonts(runs, regular, bold)
  if (normalizedRuns.length === 0) {
    state.cursorY -= LINE_HEIGHT
    return
  }
  const spaceWidth = regular.widthOfTextAtSize(' ', BODY_FONT_SIZE)
  const lineWidth = measureTokenLine(normalizedRuns, regular, bold, BODY_FONT_SIZE)
  let x = centered ? Math.max(MARGIN, (PAGE_WIDTH - lineWidth) / 2) : MARGIN

  for (let index = 0; index < normalizedRuns.length; index += 1) {
    const run = normalizedRuns[index]
    const font = run.bold ? bold : regular
    if (index > 0) {
      x += spaceWidth
    }
    context.page.drawText(run.text, {
      x,
      y: state.cursorY,
      size: BODY_FONT_SIZE,
      font,
      color: rgb(0.1, 0.1, 0.12),
    })
    x += font.widthOfTextAtSize(run.text, BODY_FONT_SIZE)
  }

  state.cursorY -= LINE_HEIGHT
}

function drawHeading(
  text: string,
  pdf: PDFDocument,
  state: PdfLayoutState,
  context: PdfPageContext,
  writerFonts: Awaited<ReturnType<typeof loadPdfFonts>>,
) {
  ensureLineCapacity(pdf, state, context)
  const safeHeading = safeTextForFont(text.trim(), writerFonts.bold)
  context.page.drawText(safeHeading, {
    x: MARGIN,
    y: state.cursorY,
    size: HEADING_FONT_SIZE,
    font: writerFonts.bold,
    color: rgb(0.1, 0.1, 0.12),
  })
  state.cursorY -= LINE_HEIGHT + 4
}

async function drawPdfImage(
  imagePath: string,
  pdf: PDFDocument,
  state: PdfLayoutState,
  context: PdfPageContext,
): Promise<void> {
  try {
    const { type, bytes } = await loadImageBytes(imagePath)
    if (!bytes || !type) return
    const image = type === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
    const scale = Math.min((PAGE_WIDTH - MARGIN * 2) / image.width, 300 / image.height, 1)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    if (state.cursorY - drawHeight < MARGIN) {
      addPage(pdf, state, context)
    }
    state.cursorY -= drawHeight
    context.page.drawImage(image, { x: MARGIN, y: state.cursorY, width: drawWidth, height: drawHeight })
    state.cursorY -= LINE_HEIGHT
  } catch (err) {
    console.warn(`Failed to embed image in PDF: ${imagePath}`, err instanceof Error ? err.message : String(err))
  }
}

async function createPdfWriter(pdf: PDFDocument, state: PdfLayoutState): Promise<PdfWriter> {
  const writerFonts = await loadPdfFonts(pdf)
  const context: PdfPageContext = {
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
  }

  return {
    addPage: () => addPage(pdf, state, context),
    drawHeading: (text: string) => drawHeading(text, pdf, state, context, writerFonts),
    drawParagraphLine: (text: string, centered: boolean) => {
      drawWrappedParagraph(
        text,
        centered,
        (line, useCenter) => drawRuns(line, useCenter, pdf, state, context, writerFonts),
        state,
        (line) => measureTokenLine(normalizeRunsForFonts(line, writerFonts.regular, writerFonts.bold), writerFonts.regular, writerFonts.bold, BODY_FONT_SIZE),
      )
    },
    addSpacer: (lines: number) => {
      state.cursorY -= LINE_HEIGHT * lines
    },
    drawImage: async (absolutePath: string) => drawPdfImage(absolutePath, pdf, state, context),
  }
}

export async function renderPdfBook(chapters: BookExportChapter[], projectRoot = ''): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const state: PdfLayoutState = {
    cursorY: PAGE_HEIGHT - MARGIN,
    centered: false,
  }
  const writer = await createPdfWriter(pdf, state)

  for (let index = 0; index < chapters.length; index += 1) {
    const lastWasPagebreak = await renderPdfChapter(chapters[index], writer, state, projectRoot)
    state.centered = false
    if (index < chapters.length - 1) {
      if (!lastWasPagebreak) {
        writer.addSpacer(2)
      }
    }
  }

  return pdf.save()
}