import type { PdfFontPair } from './book-export-pdf-fonts.js'
import { resolvePdfFont, type PdfTextToken } from './book-export-pdf-inline.js'

export function normalizeForFont(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
}

export function safeTextForFont(text: string, font: { encodeText: (value: string) => unknown }): string {
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

export function normalizeRunsForFonts(runs: PdfTextToken[], fonts: PdfFontPair): PdfTextToken[] {
  const normalizedRuns: PdfTextToken[] = []
  for (const run of runs) {
    const font = resolvePdfFont(run, fonts)
    const safeText = safeTextForFont(run.text, font)
    if (safeText.trim()) {
      normalizedRuns.push({ ...run, text: safeText })
    }
  }
  return normalizedRuns
}
