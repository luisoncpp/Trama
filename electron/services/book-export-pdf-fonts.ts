import { access, readFile } from 'node:fs/promises'
import fontkit from '@pdf-lib/fontkit'
import { StandardFonts, type PDFDocument, type PDFFont } from 'pdf-lib'

export interface PdfFontPair {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
}

const SYSTEM_FONT_CANDIDATES: Array<{
  regular: string
  bold: string
  italic: string
  boldItalic: string
}> = [
  {
    regular: 'C:/Windows/Fonts/times.ttf',
    bold: 'C:/Windows/Fonts/timesbd.ttf',
    italic: 'C:/Windows/Fonts/timesi.ttf',
    boldItalic: 'C:/Windows/Fonts/timesbi.ttf',
  },
  {
    regular: 'C:/Windows/Fonts/georgia.ttf',
    bold: 'C:/Windows/Fonts/georgiab.ttf',
    italic: 'C:/Windows/Fonts/georgiai.ttf',
    boldItalic: 'C:/Windows/Fonts/georgiaz.ttf',
  },
  {
    regular: '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
    bold: '/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf',
    italic: '/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf',
    boldItalic: '/System/Library/Fonts/Supplemental/Times New Roman Bold Italic.ttf',
  },
  {
    regular: '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
    bold: '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
    italic: '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf',
    boldItalic: '/usr/share/fonts/truetype/dejavu/DejaVuSerif-BoldItalic.ttf',
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

    const hasItalic = await fileExists(candidate.italic)
    const hasBoldItalic = await fileExists(candidate.boldItalic)

    const [regularBytes, boldBytes, italicBytes, boldItalicBytes] = await Promise.all([
      readFile(candidate.regular),
      readFile(candidate.bold),
      hasItalic ? readFile(candidate.italic) : readFile(candidate.regular),
      hasBoldItalic ? readFile(candidate.boldItalic) : readFile(candidate.bold),
    ])

    return {
      regular: await pdf.embedFont(regularBytes, { subset: true }),
      bold: await pdf.embedFont(boldBytes, { subset: true }),
      italic: await pdf.embedFont(italicBytes, { subset: true }),
      boldItalic: await pdf.embedFont(boldItalicBytes, { subset: true }),
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

  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  return {
    regular,
    bold,
    italic: regular,
    boldItalic: bold,
  }
}
