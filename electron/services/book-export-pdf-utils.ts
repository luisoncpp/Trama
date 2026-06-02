import { PDFDocument, rgb } from 'pdf-lib'
import { loadPdfFonts } from './book-export-pdf-fonts.js'
import { inlineTokens, measureTokenLine, resolvePdfFont, type PdfTextToken, wrapTokens } from './book-export-pdf-inline.js'
import { loadImageBytes } from './book-export-image-utils.js'
import type { BookExportChapter } from './book-export-renderers.js'
import { renderPdfChapter } from './book-export-pdf-chapters.js'
import { normalizeRunsForFonts } from './book-export-pdf-font-utils.js'
import type { PdfFontPair } from './book-export-pdf-fonts.js'
import { parseInlineMarkdownRuns } from './book-export-inline-markdown.js'

export interface PdfLayoutState {
  cursorY: number
  centered: boolean
}

export interface PdfWriter {
  addPage: () => void
  drawHeading: (text: string, centered: boolean) => void
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

function headingTokens(text: string): PdfTextToken[] {
  const runs = parseInlineMarkdownRuns(text)
  const hasInlineStyle = runs.some((run) => run.bold || run.italic)
  const tokens: PdfTextToken[] = []

  for (const run of runs) {
    const words = run.text.split(/\s+/).filter(Boolean)
    for (const word of words) {
      tokens.push({
        text: word,
        bold: hasInlineStyle ? run.bold : true,
        italic: run.italic,
      })
    }
  }

  return tokens
}

function drawRuns(
  runs: PdfTextToken[],
  centered: boolean,
  fontSize: number,
  lineHeight: number,
  pdf: PDFDocument,
  state: PdfLayoutState,
  context: PdfPageContext,
  writerFonts: PdfFontPair,
) {
  ensureLineCapacity(pdf, state, context)
  const normalizedRuns = normalizeRunsForFonts(runs, writerFonts)
  if (normalizedRuns.length === 0) {
    state.cursorY -= lineHeight
    return
  }
  const spaceWidth = writerFonts.regular.widthOfTextAtSize(' ', fontSize)
  const lineWidth = measureTokenLine(normalizedRuns, writerFonts, fontSize)
  let x = centered ? Math.max(MARGIN, (PAGE_WIDTH - lineWidth) / 2) : MARGIN

  for (let index = 0; index < normalizedRuns.length; index += 1) {
    const run = normalizedRuns[index]
    const font = resolvePdfFont(run, writerFonts)
    if (index > 0) {
      x += spaceWidth
    }
    context.page.drawText(run.text, {
      x,
      y: state.cursorY,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.12),
    })
    x += font.widthOfTextAtSize(run.text, fontSize)
  }

  state.cursorY -= lineHeight
}

function drawHeading(
  text: string,
  centered: boolean,
  pdf: PDFDocument,
  state: PdfLayoutState,
  context: PdfPageContext,
  writerFonts: PdfFontPair,
) {
  const tokens = headingTokens(text)
  if (tokens.length === 0) {
    state.cursorY -= LINE_HEIGHT + 4
    return
  }

  drawRuns(tokens, centered, HEADING_FONT_SIZE, LINE_HEIGHT + 4, pdf, state, context, writerFonts)
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
    const scale = Math.min((PAGE_WIDTH - MARGIN * 2) / image.width, (PAGE_HEIGHT - MARGIN * 2) / image.height, 1)
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

export async function createPdfWriter(pdf: PDFDocument, state: PdfLayoutState): Promise<PdfWriter> {
  const writerFonts = await loadPdfFonts(pdf)
  const context: PdfPageContext = {
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
  }

  return {
    addPage: () => addPage(pdf, state, context),
    drawHeading: (text: string, centered: boolean) => drawHeading(text, centered, pdf, state, context, writerFonts),
    drawParagraphLine: (text: string, centered: boolean) => {
      drawWrappedParagraph(
        text,
        centered,
        (line, useCenter) => drawRuns(line, useCenter, BODY_FONT_SIZE, LINE_HEIGHT, pdf, state, context, writerFonts),
        state,
        (line) => measureTokenLine(normalizeRunsForFonts(line, writerFonts), writerFonts, BODY_FONT_SIZE),
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