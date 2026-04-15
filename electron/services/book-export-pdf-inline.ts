import type { PDFFont } from 'pdf-lib'

export interface PdfTextToken {
  text: string
  bold: boolean
}

export function inlineTokens(text: string): PdfTextToken[] {
  const source = text
    .replace(/^#{1,6}\s+/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/<(strong|b)>([\s\S]*?)<\/(strong|b)>/gi, '**$2**')
    .trim()

  if (!source) {
    return []
  }

  const tokens: PdfTextToken[] = []
  const strongPattern = /(\*\*[^*]+\*\*|__[^_]+__)/g
  let cursor = 0

  const pushWords = (raw: string, bold: boolean) => {
    const normalized = raw
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .trim()

    for (const word of normalized.split(/\s+/).filter(Boolean)) {
      tokens.push({ text: word, bold })
    }
  }

  for (const match of source.matchAll(strongPattern)) {
    const start = match.index ?? 0
    pushWords(source.slice(cursor, start), false)
    pushWords(match[0].slice(2, -2), true)
    cursor = start + match[0].length
  }

  pushWords(source.slice(cursor), false)
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

export function measureTokenLine(tokens: PdfTextToken[], regular: PDFFont, bold: PDFFont, fontSize: number): number {
  const spaceWidth = regular.widthOfTextAtSize(' ', fontSize)
  return tokens.reduce((sum, token, index) => {
    const font = token.bold ? bold : regular
    return sum + font.widthOfTextAtSize(token.text, fontSize) + (index > 0 ? spaceWidth : 0)
  }, 0)
}
