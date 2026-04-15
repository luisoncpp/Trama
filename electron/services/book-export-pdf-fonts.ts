import { access, readFile } from 'node:fs/promises'
import fontkit from '@pdf-lib/fontkit'
import { StandardFonts, type PDFDocument, type PDFFont } from 'pdf-lib'

export interface PdfFontPair {
  regular: PDFFont
  bold: PDFFont
}

const SYSTEM_FONT_CANDIDATES: Array<{ regular: string; bold: string }> = [
  {
    regular: 'C:/Windows/Fonts/times.ttf',
    bold: 'C:/Windows/Fonts/timesbd.ttf',
  },
  {
    regular: 'C:/Windows/Fonts/georgia.ttf',
    bold: 'C:/Windows/Fonts/georgiab.ttf',
  },
  {
    regular: '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
    bold: '/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf',
  },
  {
    regular: '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
    bold: '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
  },
]

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function loadSystemFonts(pdf: PDFDocument): Promise<PdfFontPair | null> {
  for (const candidate of SYSTEM_FONT_CANDIDATES) {
    if (!(await fileExists(candidate.regular)) || !(await fileExists(candidate.bold))) {
      continue
    }

    const [regularBytes, boldBytes] = await Promise.all([
      readFile(candidate.regular),
      readFile(candidate.bold),
    ])

    return {
      regular: await pdf.embedFont(regularBytes, { subset: true }),
      bold: await pdf.embedFont(boldBytes, { subset: true }),
    }
  }

  return null
}

export async function loadPdfFonts(pdf: PDFDocument): Promise<PdfFontPair> {
  pdf.registerFontkit(fontkit)
  const systemFonts = await loadSystemFonts(pdf)
  if (systemFonts) {
    return systemFonts
  }

  return {
    regular: await pdf.embedFont(StandardFonts.TimesRoman),
    bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
  }
}
