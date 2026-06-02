import type { PDFFont } from 'pdf-lib'
import { parseInlineMarkdownRuns } from './book-export-inline-markdown.js'

export interface PdfTextToken {
  text: string
  bold: boolean
  italic: boolean
}

export function inlineTokens(text: string): PdfTextToken[] {
  const runs = parseInlineMarkdownRuns(text)
  const tokens: PdfTextToken[] = []

  for (const run of runs) {
    const words = run.text.split(/\s+/).filter(Boolean)
    for (const word of words) {
      tokens.push({ text: word, bold: run.bold, italic: run.italic })
    }
  }

  return tokens
}

export function wrapTokens(
  tokens: PdfTextToken[],
  maxWidth: number,
  measure: (candidate: PdfTextToken[]) => number,
): PdfTextToken[][] {
  if (tokens.length === 0) {
    return []
  }

  const lines: PdfTextToken[][] = []
  let current: PdfTextToken[] = []

  for (const token of tokens) {
    const candidate = [...current, token]
    if (current.length === 0 || measure(candidate) <= maxWidth) {
      current = candidate
      continue
    }

    lines.push(current)
    current = [token]
  }

  if (current.length > 0) {
    lines.push(current)
  }

  return lines
}

export function resolvePdfFont(
  token: PdfTextToken,
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont },
): PDFFont {
  if (token.bold && token.italic) {
    return fonts.boldItalic
  }
  if (token.bold) {
    return fonts.bold
  }
  if (token.italic) {
    return fonts.italic
  }
  return fonts.regular
}

export function measureTokenLine(
  tokens: PdfTextToken[],
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont },
  fontSize: number,
): number {
  const spaceWidth = fonts.regular.widthOfTextAtSize(' ', fontSize)
  return tokens.reduce((sum, token, index) => {
    const font = resolvePdfFont(token, fonts)
    return sum + font.widthOfTextAtSize(token.text, fontSize) + (index > 0 ? spaceWidth : 0)
  }, 0)
}
