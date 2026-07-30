// @Architecture(descriptionShort="Pure source-level fallback for labeling blank-line spacers from Contents")
import { parseDirectiveLabelSuffix, serializeDirectiveLabelSuffix } from '../../../../shared/markdown-layout-directive-label.js'
import type { DocumentContentsLabelTarget } from '../../project-editor-types.js'

const FRONTMATTER_DELIMITER = '---'
const FENCE_OPEN_REGEX = /^ {0,3}(`{3,}|~{3,})/
const FENCE_CLOSE_REGEX = /^ {0,3}(`+|~+)\s*$/
const HEADING_REGEX = /^(#{1,3})\s+/
const TRAMA_COMMENT_REGEX = /^<!--\s*trama:([\s\S]*?)\s*-->$/

interface FenceState {
  char: string
  length: number
}

function skipFrontmatter(lines: string[]): number {
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) return 0
  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER)
  return endIndex === -1 ? 0 : endIndex + 1
}

function matchFenceOpen(line: string): FenceState | null {
  const match = FENCE_OPEN_REGEX.exec(line)
  return match ? { char: match[1][0], length: match[1].length } : null
}

function isFenceClose(line: string, fence: FenceState): boolean {
  const match = FENCE_CLOSE_REGEX.exec(line)
  return Boolean(match && match[1][0] === fence.char && match[1].length >= fence.length)
}

function parseCommentDirective(line: string): { base: string } | null {
  const match = TRAMA_COMMENT_REGEX.exec(line.trim())
  if (!match) return null
  return { base: parseDirectiveLabelSuffix(match[1] ?? '', 0).base }
}

function isTarget(target: DocumentContentsLabelTarget, ordinal: number, type: 'pagebreak' | 'spacer'): boolean {
  return target.ordinal === ordinal && target.type === type
}

function labeledComment(type: 'pagebreak' | 'spacer', label: string | null, lines?: number): string {
  const suffix = serializeDirectiveLabelSuffix(label ?? undefined)
  return type === 'pagebreak'
    ? `<!-- trama:pagebreak${suffix} -->`
    : `<!-- trama:spacer lines=${lines ?? 1}${suffix} -->`
}

function updateCommentDirective(
  lines: string[],
  index: number,
  target: DocumentContentsLabelTarget,
  type: 'pagebreak' | 'spacer',
  base: string,
  lineEnding: string,
): string {
  const match = base.match(/^spacer(?:\s+lines=([^\s>]+))?$/)
  const parsedLines = Number.parseInt(match?.[1] ?? '1', 10)
  const spacerLines = Number.isInteger(parsedLines) && parsedLines >= 1 && parsedLines <= 12 ? parsedLines : 1
  lines[index] = labeledComment(type, target.label, spacerLines)
  return lines.join(lineEnding)
}

function updateBlankLineSpacer(
  lines: string[],
  index: number,
  count: number,
  target: DocumentContentsLabelTarget,
  lineEnding: string,
): string {
  lines.splice(index, count, labeledComment('spacer', target.label, count))
  return lines.join(lineEnding)
}

export function setMarkdownLayoutDirectiveLabel(markdown: string, target: DocumentContentsLabelTarget): string | null {
  const lineEnding = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.split(/\r?\n/)
  let ordinal = 0
  let fence: FenceState | null = null

  for (let index = skipFrontmatter(lines); index < lines.length; index += 1) {
    const line = lines[index]
    if (fence) {
      if (isFenceClose(line, fence)) fence = null
      continue
    }

    fence = matchFenceOpen(line)
    if (fence) continue

    const comment = parseCommentDirective(line)
    if (comment?.base === 'pagebreak') {
      if (isTarget(target, ordinal, 'pagebreak')) {
        return updateCommentDirective(lines, index, target, 'pagebreak', comment.base, lineEnding)
      }
      ordinal += 1
      continue
    }

    const spacerMatch = comment?.base.match(/^spacer(?:\s+lines=([^\s>]+))?$/)
    if (spacerMatch) {
      if (isTarget(target, ordinal, 'spacer')) {
        return updateCommentDirective(lines, index, target, 'spacer', comment?.base ?? '', lineEnding)
      }
      ordinal += 1
      continue
    }

    if (HEADING_REGEX.test(line)) {
      ordinal += 1
      continue
    }

    if (line.trim().length !== 0) continue
    let end = index
    while (end < lines.length && lines[end].trim().length === 0) end += 1
    const blankCount = end - index
    if (blankCount >= 2) {
      if (isTarget(target, ordinal, 'spacer')) {
        return updateBlankLineSpacer(lines, index, blankCount, target, lineEnding)
      }
      ordinal += 1
    }
    index = end - 1
  }

  return null
}
