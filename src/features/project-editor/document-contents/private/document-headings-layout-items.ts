// @Architecture(descriptionShort="Page-break and spacer matchers for document Contents parsing")
import { decodeDirectiveHtmlAttribute, parseDirectiveLabelSuffix } from '../../../../shared/markdown-layout-directive-label.js'
import type { DocumentHeading } from './document-headings-parser.js'

const PAGEBREAK_DIV_REGEX = /data-trama-directive=["']pagebreak["']/
const SPACER_DIV_REGEX = /data-trama-directive=["']spacer["']/
const SPACER_LINES_ATTR_REGEX = /data-trama-lines=["'](\d+)["']/
const TRAMA_COMMENT_REGEX = /^<!--\s*trama:([\s\S]*?)\s*-->$/
const HTML_LABEL_ATTR_REGEX = /data-trama-label=(["'])(.*?)\1/

type LayoutHeadingDraft = Omit<DocumentHeading, 'ordinal'>

function extractCommentDirective(line: string): { base: string; label?: string } | null {
  const match = TRAMA_COMMENT_REGEX.exec(line.trim())
  if (!match) {
    return null
  }
  const parsed = parseDirectiveLabelSuffix(match[1] ?? '', 0)
  return { base: parsed.base, label: parsed.label }
}

function extractHtmlLabel(line: string): string | undefined {
  const match = HTML_LABEL_ATTR_REGEX.exec(line)
  return decodeDirectiveHtmlAttribute(match?.[2] ?? null)
}

function layoutItem(
  type: 'pagebreak' | 'spacer',
  fallback: string,
  label: string | undefined,
  lines?: number,
): LayoutHeadingDraft {
  return {
    type,
    level: 1,
    ...(lines === undefined ? {} : { lines }),
    ...(label ? { label } : {}),
    text: label ?? fallback,
  }
}

export function matchPageBreak(line: string): LayoutHeadingDraft | null {
  const trimmed = line.trim()
  const comment = extractCommentDirective(trimmed)
  if (comment?.base === 'pagebreak') {
    return layoutItem('pagebreak', 'Page Break', comment.label)
  }
  if (PAGEBREAK_DIV_REGEX.test(line)) {
    return layoutItem('pagebreak', 'Page Break', extractHtmlLabel(line))
  }
  return null
}

function normalizeSpacerLines(raw: string | undefined): number {
  const linesVal = Number.parseInt(raw ?? '1', 10)
  return Number.isInteger(linesVal) && linesVal >= 1 ? Math.min(12, linesVal) : 1
}

function spacerFallbackText(lines: number): string {
  return lines > 1 ? `Spacer (${lines} lines)` : 'Spacer'
}

function matchSpacerComment(trimmed: string): LayoutHeadingDraft | null {
  const comment = extractCommentDirective(trimmed)
  const commentMatch = comment?.base.match(/^spacer(?:\s+lines=([^\s>]+))?$/)
  if (!commentMatch) {
    return null
  }
  const lines = normalizeSpacerLines(commentMatch[1])
  return layoutItem('spacer', spacerFallbackText(lines), comment?.label, lines)
}

function matchSpacerHtml(line: string): LayoutHeadingDraft | null {
  if (!SPACER_DIV_REGEX.test(line)) {
    return null
  }
  const linesMatch = SPACER_LINES_ATTR_REGEX.exec(line)
  const lines = normalizeSpacerLines(linesMatch?.[1])
  return layoutItem('spacer', spacerFallbackText(lines), extractHtmlLabel(line), lines)
}

export function matchSpacerDirective(line: string): LayoutHeadingDraft | null {
  return matchSpacerComment(line.trim()) ?? matchSpacerHtml(line)
}
