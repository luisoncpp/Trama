// @Architecture(descriptionShort="Markdown ATX heading extraction (H1-H3) with frontmatter and fenced-code awareness")

export type DocumentHeadingType = 'heading' | 'pagebreak' | 'spacer'

export interface DocumentHeading {
  type?: DocumentHeadingType
  level: 1 | 2 | 3
  text: string
  ordinal: number
  lines?: number
}

export interface ParseDocumentHeadingsOptions {
  includePageBreaks?: boolean
  includeSpacers?: boolean
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

const PAGEBREAK_COMMENT_REGEX = /^<!--\s*trama:pagebreak\s*-->$/
const PAGEBREAK_DIV_REGEX = /data-trama-directive=["']pagebreak["']/
const SPACER_COMMENT_REGEX = /^<!--\s*trama:spacer(?:\s+lines=([^\s>]+))?\s*-->$/
const SPACER_DIV_REGEX = /data-trama-directive=["']spacer["']/
const SPACER_LINES_ATTR_REGEX = /data-trama-lines=["'](\d+)["']/

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
  return { type: 'heading', level: match[1].length as 1 | 2 | 3, text }
}

function matchPageBreak(line: string): Omit<DocumentHeading, 'ordinal'> | null {
  const trimmed = line.trim()
  if (PAGEBREAK_COMMENT_REGEX.test(trimmed) || PAGEBREAK_DIV_REGEX.test(line)) {
    return { type: 'pagebreak', level: 1, text: 'Page Break' }
  }
  return null
}

function matchSpacerDirective(line: string): Omit<DocumentHeading, 'ordinal'> | null {
  const trimmed = line.trim()
  const commentMatch = SPACER_COMMENT_REGEX.exec(trimmed)
  if (commentMatch) {
    const linesVal = Number.parseInt(commentMatch[1] ?? '1', 10)
    const lines = Number.isInteger(linesVal) && linesVal >= 1 ? Math.min(12, linesVal) : 1
    return { type: 'spacer', level: 1, lines, text: lines > 1 ? `Spacer (${lines} lines)` : 'Spacer' }
  }
  if (SPACER_DIV_REGEX.test(line)) {
    const linesMatch = SPACER_LINES_ATTR_REGEX.exec(line)
    const linesVal = linesMatch ? Number.parseInt(linesMatch[1], 10) : 1
    const lines = Number.isInteger(linesVal) && linesVal >= 1 ? Math.min(12, linesVal) : 1
    return { type: 'spacer', level: 1, lines, text: lines > 1 ? `Spacer (${lines} lines)` : 'Spacer' }
  }
  return null
}

export function parseDocumentHeadings(
  markdown: string,
  options?: ParseDocumentHeadingsOptions,
): DocumentHeading[] {
  const includePageBreaks = options?.includePageBreaks ?? true
  const includeSpacers = options?.includeSpacers ?? true

  const lines = markdown.split(/\r?\n/)
  const headings: DocumentHeading[] = []
  let fence: FenceState | null = null
  let blankCount = 0

  const flushBlankCount = (): void => {
    if (includeSpacers && blankCount >= 2) {
      headings.push({
        type: 'spacer',
        level: 1,
        lines: blankCount,
        text: `Spacer (${blankCount} lines)`,
        ordinal: headings.length,
      })
    }
    blankCount = 0
  }

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
      flushBlankCount()
      continue
    }

    const trimmed = line.trim()

    // Pagebreak check
    const pageBreak = matchPageBreak(line)
    if (pageBreak) {
      flushBlankCount()
      if (includePageBreaks) {
        headings.push({ ...pageBreak, ordinal: headings.length })
      }
      continue
    }

    // Spacer directive check
    const spacerDirective = matchSpacerDirective(line)
    if (spacerDirective) {
      flushBlankCount()
      if (includeSpacers) {
        headings.push({ ...spacerDirective, ordinal: headings.length })
      }
      continue
    }

    // Heading check
    const heading = matchHeading(line)
    if (heading) {
      flushBlankCount()
      headings.push({ ...heading, ordinal: headings.length })
      continue
    }

    // Track blank lines
    if (trimmed.length === 0) {
      blankCount += 1
    } else {
      flushBlankCount()
    }
  }

  flushBlankCount()

  return headings
}

