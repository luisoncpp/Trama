export { serializeDirectiveArtifactNode } from './markdown-layout-directives-artifact-node.js'

export type LayoutDirectiveType = 'center-start' | 'center-end' | 'spacer' | 'pagebreak' | 'unknown'

export interface LayoutDirectiveWarning {
  line: number
  message: string
}

export interface LayoutDirective {
  type: LayoutDirectiveType
  line: number
  lines?: number
  raw?: string
}

interface ParseToken {
  directive: LayoutDirective
  transformed: boolean
}

interface DirectiveParseResult {
  tokensByLine: Map<number, ParseToken>
  warnings: LayoutDirectiveWarning[]
}

const CENTER_START = '<!-- trama:center:start -->'
const CENTER_END = '<!-- trama:center:end -->'
const PAGEBREAK = '<!-- trama:pagebreak -->'
const TRAMA_COMMENT = /^<!--\s*trama:([\s\S]*?)\s*-->$/
const SPACER = /^<!--\s*trama:spacer(?:\s+lines=([^\s>]+))?\s*-->$/

function parseSpacerLine(value: string | undefined, line: number, warnings: LayoutDirectiveWarning[]): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  const isValid = Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
  if (isValid) return parsed
  warnings.push({ line, message: 'Invalid spacer lines value; fallback to 1.' })
  return 1
}

function parseLineDirective(lineText: string, line: number, warnings: LayoutDirectiveWarning[]): LayoutDirective | null {
  const trimmed = lineText.trim()
  if (trimmed === CENTER_START) return { type: 'center-start', line }
  if (trimmed === CENTER_END) return { type: 'center-end', line }
  if (trimmed === PAGEBREAK) return { type: 'pagebreak', line }
  const spacerMatch = trimmed.match(SPACER)
  if (spacerMatch) {
    return {
      type: 'spacer',
      line,
      lines: parseSpacerLine(spacerMatch[1], line, warnings),
    }
  }
  if (TRAMA_COMMENT.test(trimmed)) return { type: 'unknown', line, raw: trimmed }
  return null
}

function markCenterTransforms(tokensByLine: Map<number, ParseToken>, warnings: LayoutDirectiveWarning[]): void {
  const centerStarts: number[] = []

  for (const [line, token] of tokensByLine.entries()) {
    if (token.directive.type === 'center-start') {
      centerStarts.push(line)
      continue
    }
    if (token.directive.type !== 'center-end') continue
    const startLine = centerStarts.pop()
    if (startLine === undefined) {
      warnings.push({ line, message: 'center:end without matching center:start.' })
      continue
    }
    token.transformed = true
    const startToken = tokensByLine.get(startLine)
    if (startToken) startToken.transformed = true
  }
  for (const line of centerStarts) {
    warnings.push({ line, message: 'center:start without matching center:end.' })
  }
}

function parseDirectiveTokens(markdown: string): DirectiveParseResult {
  const tokensByLine = new Map<number, ParseToken>()
  const warnings: LayoutDirectiveWarning[] = []
  const lines = markdown.split('\n')

  for (let index = 0; index < lines.length; index++) {
    const line = index + 1
    const directive = parseLineDirective(lines[index] ?? '', line, warnings)
    if (!directive) continue
    const transformed = directive.type !== 'center-start' && directive.type !== 'center-end'
    tokensByLine.set(line, { directive, transformed })
  }
  markCenterTransforms(tokensByLine, warnings)
  return { tokensByLine, warnings }
}

function encodeRawDirective(raw: string): string {
  return encodeURIComponent(raw)
}

export function serializeDirectiveComment(directive: LayoutDirective): string {
  switch (directive.type) {
    case 'center-start':
      return CENTER_START
    case 'center-end':
      return CENTER_END
    case 'spacer':
      return `<!-- trama:spacer lines=${directive.lines ?? 1} -->`
    case 'pagebreak':
      return PAGEBREAK
    case 'unknown':
      return directive.raw ?? '<!-- trama:unknown -->'
    default:
      return ''
  }
}

export function extractDirectives(markdown: string): {
  markdownWithoutDirectives: string
  directives: LayoutDirective[]
  warnings: LayoutDirectiveWarning[]
} {
  const lines = markdown.split('\n')
  const { tokensByLine, warnings } = parseDirectiveTokens(markdown)
  const directives: LayoutDirective[] = []
  const keptLines: string[] = []

  for (let index = 0; index < lines.length; index++) {
    const line = index + 1
    const token = tokensByLine.get(line)
    if (token && token.transformed) {
      directives.push(token.directive)
      continue
    }
    keptLines.push(lines[index] ?? '')
  }
  return {
    markdownWithoutDirectives: keptLines.join('\n'),
    directives,
    warnings,
  }
}

export function renderDirectiveArtifactsToMarkdown(markdown: string): {
  markdownWithArtifacts: string
  warnings: LayoutDirectiveWarning[]
} {
  const lines = markdown.split('\n')
  const { tokensByLine, warnings } = parseDirectiveTokens(markdown)
  const renderedLines: string[] = []

  for (let index = 0; index < lines.length; index++) {
    const line = index + 1
    const token = tokensByLine.get(line)
    if (!token || !token.transformed) {
      renderedLines.push(lines[index] ?? '')
      continue
    }
    const directive = token.directive
    if (directive.type === 'center-start') {
      renderedLines.push('<div class="trama-center-boundary trama-center-start" data-trama-directive="center" data-trama-role="start"></div>')
    } else if (directive.type === 'center-end') {
      renderedLines.push('<div class="trama-center-boundary trama-center-end" data-trama-directive="center" data-trama-role="end"></div>')
    } else if (directive.type === 'spacer') {
      const safeLines = Number.isInteger(directive.lines) ? Math.min(12, Math.max(1, directive.lines ?? 1)) : 1
      renderedLines.push(`<div class="trama-spacer trama-spacer-${safeLines}" data-trama-directive="spacer" data-trama-lines="${safeLines}"></div>`)
    } else if (directive.type === 'pagebreak') {
      renderedLines.push('<div class="trama-pagebreak" data-trama-directive="pagebreak" contenteditable="false"></div>')
    } else {
      const encodedRaw = encodeRawDirective(directive.raw ?? '')
      renderedLines.push(`<div class="trama-directive-unknown" data-trama-directive="unknown" data-trama-raw="${encodedRaw}"></div>`)
    }
  }
  return {
    markdownWithArtifacts: renderedLines.join('\n'),
    warnings,
  }
}
