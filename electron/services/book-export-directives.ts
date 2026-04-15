export type BookExportDirective =
  | { kind: 'pagebreak' }
  | { kind: 'centerStart' }
  | { kind: 'centerEnd' }
  | { kind: 'spacer'; lines: number }

const PAGEBREAK_PATTERN = /^<!--\s*trama:pagebreak\s*-->$/
const CENTER_START_PATTERN = /^<!--\s*trama:center:start\s*-->$/
const CENTER_END_PATTERN = /^<!--\s*trama:center:end\s*-->$/
const SPACER_PATTERN = /^<!--\s*trama:spacer\s+lines=(\d+)\s*-->$/

const PAGEBREAK_HTML_CLASS_PATTERN = /^<(?:div|hr)\b[^>]*\bclass=(['"])[^'"]*\btrama-pagebreak\b[^'"]*\1[^>]*\/?>(?:<\/div>)?$/i
const PAGEBREAK_HTML_DATA_PATTERN = /^<(?:div|hr)\b[^>]*\bdata-trama-directive=(['"])pagebreak\1[^>]*\/?>(?:<\/div>)?$/i
const CENTER_BOUNDARY_PATTERN = /^<div\b[^>]*\bdata-trama-directive=(['"])center\1[^>]*\bdata-trama-role=(['"])(start|end)\2[^>]*><\/div>$/i
const SPACER_HTML_DATA_PATTERN = /^<div\b[^>]*\bdata-trama-directive=(['"])spacer\1[^>]*\bdata-trama-lines=(['"])(\d+)\2[^>]*><\/div>$/i
const SPACER_HTML_STYLE_PATTERN = /^<div\b[^>]*\bclass=(['"])[^'"]*\btrama-spacer\b[^'"]*\1[^>]*\bstyle=(['"])[^'"]*height\s*:\s*(\d+)em[^'"]*\2[^>]*><\/div>$/i

function clampSpacerLines(lines: number): number {
  if (!Number.isFinite(lines)) {
    return 1
  }

  return Math.max(1, Math.min(12, Math.floor(lines)))
}

export function parseDirectiveLine(line: string): BookExportDirective | null {
  const trimmed = line.trim()

  if (PAGEBREAK_PATTERN.test(trimmed)) {
    return { kind: 'pagebreak' }
  }

  if (PAGEBREAK_HTML_CLASS_PATTERN.test(trimmed) || PAGEBREAK_HTML_DATA_PATTERN.test(trimmed)) {
    return { kind: 'pagebreak' }
  }

  if (CENTER_START_PATTERN.test(trimmed)) {
    return { kind: 'centerStart' }
  }

  if (CENTER_END_PATTERN.test(trimmed)) {
    return { kind: 'centerEnd' }
  }

  const boundaryMatch = trimmed.match(CENTER_BOUNDARY_PATTERN)
  if (boundaryMatch) {
    return boundaryMatch[3].toLowerCase() === 'start'
      ? { kind: 'centerStart' }
      : { kind: 'centerEnd' }
  }

  const spacerMatch = trimmed.match(SPACER_PATTERN)
  if (spacerMatch) {
    return { kind: 'spacer', lines: clampSpacerLines(Number(spacerMatch[1])) }
  }

  const spacerDataMatch = trimmed.match(SPACER_HTML_DATA_PATTERN)
  if (spacerDataMatch) {
    return { kind: 'spacer', lines: clampSpacerLines(Number(spacerDataMatch[3])) }
  }

  const spacerStyleMatch = trimmed.match(SPACER_HTML_STYLE_PATTERN)
  if (spacerStyleMatch) {
    return { kind: 'spacer', lines: clampSpacerLines(Number(spacerStyleMatch[3])) }
  }

  return null
}

function renderHtmlDirective(directive: BookExportDirective): string {
  switch (directive.kind) {
    case 'pagebreak':
      return '<div class="trama-pagebreak" aria-hidden="true"></div>'
    case 'centerStart':
      return '<div class="trama-center">'
    case 'centerEnd':
      return '</div>'
    case 'spacer':
      return `<div class="trama-spacer" style="height:${directive.lines}em" aria-hidden="true"></div>`
  }
}

export function replaceDirectivesForHtml(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      const directive = parseDirectiveLine(line)
      return directive ? renderHtmlDirective(directive) : line
    })
    .join('\n')
}
