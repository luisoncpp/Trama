// @Architecture(descriptionShort="Markdown ATX heading extraction (H1-H3) with frontmatter and fenced-code awareness")

export interface DocumentHeading {
  level: 1 | 2 | 3
  text: string
  ordinal: number
}

interface FenceState {
  char: string
  length: number
}

const FRONTMATTER_DELIMITER = '---'
const ATX_HEADING_REGEX = /^(#{1,3})\s+(.*)$/
const CLOSING_HASHES_REGEX = /(^|\s)#+\s*$/
const INLINE_MARKERS_REGEX = /[*_~`]/g
const FENCE_OPEN_REGEX = /^ {0,3}(`{3,}|~{3,})/
const FENCE_CLOSE_REGEX = /^ {0,3}(`+|~+)\s*$/

function skipFrontmatter(lines: string[]): number {
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return 0
  }
  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER)
  return endIndex === -1 ? 0 : endIndex + 1
}

function matchFenceOpen(line: string): FenceState | null {
  const match = FENCE_OPEN_REGEX.exec(line)
  if (!match) {
    return null
  }
  return { char: match[1][0], length: match[1].length }
}

function isFenceClose(line: string, fence: FenceState): boolean {
  const match = FENCE_CLOSE_REGEX.exec(line)
  if (!match) {
    return false
  }
  return match[1][0] === fence.char && match[1].length >= fence.length
}

function matchHeading(line: string): Omit<DocumentHeading, 'ordinal'> | null {
  const match = ATX_HEADING_REGEX.exec(line)
  if (!match) {
    return null
  }
  const withoutClosing = match[2].replace(CLOSING_HASHES_REGEX, '')
  const text = withoutClosing.replace(INLINE_MARKERS_REGEX, '').trim()
  if (!text) {
    return null
  }
  return { level: match[1].length as 1 | 2 | 3, text }
}

export function parseDocumentHeadings(markdown: string): DocumentHeading[] {
  const lines = markdown.split(/\r?\n/)
  const headings: DocumentHeading[] = []
  let fence: FenceState | null = null

  for (let index = skipFrontmatter(lines); index < lines.length; index += 1) {
    const line = lines[index]
    if (fence) {
      if (isFenceClose(line, fence)) {
        fence = null
      }
      continue
    }
    fence = matchFenceOpen(line)
    if (fence) {
      continue
    }
    const heading = matchHeading(line)
    if (heading) {
      headings.push({ ...heading, ordinal: headings.length })
    }
  }

  return headings
}
