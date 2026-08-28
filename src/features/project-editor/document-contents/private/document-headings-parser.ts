// @Architecture(descriptionShort="Markdown ATX heading extraction (H1-H3) with frontmatter and fenced-code awareness")
import { matchPageBreak, matchSpacerDirective } from './document-headings-layout-items.js'

export type DocumentHeadingType = 'heading' | 'pagebreak' | 'spacer'

export interface DocumentHeading {
  type?: DocumentHeadingType
  level: 1 | 2 | 3
  text: string
  ordinal: number
  lines?: number
  label?: string
}

export interface ParseDocumentHeadingsOptions {
  includePageBreaks?: boolean
  includeSpacers?: boolean
}

interface FenceState {
  char: string; length: number
}

interface DocumentHeadingScanState {
  headings: DocumentHeading[]; fence: FenceState | null
  blankCount: number; nextOrdinal: number
  includePageBreaks: boolean; includeSpacers: boolean
}

const FRONTMATTER_DELIMITER = '---'
const ATX_HEADING_REGEX = /^(#{1,3})\s+(.*)$/
const CLOSING_HASHES_REGEX = /(^|\s)#+\s*$/
const INLINE_MARKERS_REGEX = /[*_~`]/g
const MARKDOWN_INLINE_ESCAPE_REGEX = /\\([\\`*_{}[\]()#+\-.!])/g

function unescapeMarkdownInline(text: string): string {
  return text.replace(MARKDOWN_INLINE_ESCAPE_REGEX, '$1')
}
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
  const text = unescapeMarkdownInline(withoutClosing.replace(INLINE_MARKERS_REGEX, '')).trim()
  if (!text) {
    return null
  }
  return { type: 'heading', level: match[1].length as 1 | 2 | 3, text }
}

function appendItem(
  state: DocumentHeadingScanState,
  item: Omit<DocumentHeading, 'ordinal'>,
  included: boolean,
): void {
  const withOrdinal = { ...item, ordinal: state.nextOrdinal }
  state.nextOrdinal += 1
  if (included) state.headings.push(withOrdinal)
}

function flushBlankCount(state: DocumentHeadingScanState): void {
  if (state.blankCount >= 2) {
    appendItem(state, {
      type: 'spacer',
      level: 1,
      lines: state.blankCount,
      text: `Spacer (${state.blankCount} lines)`,
    }, state.includeSpacers)
  }
  state.blankCount = 0
}

function scanMarkdownLine(state: DocumentHeadingScanState, line: string): void {
  const pageBreak = matchPageBreak(line)
  if (pageBreak) {
    flushBlankCount(state)
    appendItem(state, pageBreak, state.includePageBreaks)
    return
  }

  const spacerDirective = matchSpacerDirective(line)
  if (spacerDirective) {
    flushBlankCount(state)
    appendItem(state, spacerDirective, state.includeSpacers)
    return
  }

  const heading = matchHeading(line)
  if (heading) {
    flushBlankCount(state)
    appendItem(state, heading, true)
    return
  }

  if (line.trim().length === 0) state.blankCount += 1
  else flushBlankCount(state)
}

function scanMarkdownLines(lines: string[], state: DocumentHeadingScanState): void {
  for (let index = skipFrontmatter(lines); index < lines.length; index += 1) {
    const line = lines[index]
    if (state.fence) {
      if (isFenceClose(line, state.fence)) state.fence = null
      continue
    }

    state.fence = matchFenceOpen(line)
    if (state.fence) {
      flushBlankCount(state)
      continue
    }
    scanMarkdownLine(state, line)
  }
}

export function parseDocumentHeadings(
  markdown: string,
  options?: ParseDocumentHeadingsOptions,
): DocumentHeading[] {
  const state: DocumentHeadingScanState = {
    headings: [],
    fence: null,
    blankCount: 0,
    nextOrdinal: 0,
    includePageBreaks: options?.includePageBreaks ?? true,
    includeSpacers: options?.includeSpacers ?? true,
  }
  scanMarkdownLines(markdown.split(/\r?\n/), state)
  flushBlankCount(state)
  return state.headings
}
