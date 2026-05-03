import type Quill from 'quill'
import Delta from 'quill-delta'
import { LAYOUT_DIRECTIVE_BLOT_NAME, type LayoutDirectiveEmbedValue } from './rich-markdown-editor-layout-blots'

function getSpacerLinesFromClassList(classList: DOMTokenList): number {
  const linesClass = Array.from(classList).find((className) => /^trama-spacer-(\d+)$/.test(className))
  const match = linesClass?.match(/^trama-spacer-(\d+)$/)
  const lines = Number.parseInt(match?.[1] ?? '1', 10)
  return Number.isInteger(lines) && lines >= 1 && lines <= 12 ? lines : 1
}

function parseDirectiveFromNode(node: Element): LayoutDirectiveEmbedValue | null {
  const directive = node.getAttribute('data-trama-directive')

  if (directive === 'center') {
    const role = node.getAttribute('data-trama-role') === 'end' ? 'end' : 'start'
    return { directive, role }
  }

  if (directive === 'spacer') {
    const rawLines = Number.parseInt(node.getAttribute('data-trama-lines') ?? '1', 10)
    const lines = Number.isInteger(rawLines) && rawLines >= 1 && rawLines <= 12 ? rawLines : 1
    return { directive, lines }
  }

  if (directive === 'pagebreak') {
    return { directive }
  }

  if (directive === 'unknown') {
    return {
      directive,
      raw: node.getAttribute('data-trama-raw') ?? '',
    }
  }

  if (!directive) {
    if (node.classList.contains('trama-pagebreak')) {
      return { directive: 'pagebreak' }
    }

    if (node.classList.contains('trama-center-boundary')) {
      return {
        directive: 'center',
        role: node.classList.contains('trama-center-end') ? 'end' : 'start',
      }
    }

    if (node.classList.contains('trama-spacer')) {
      return {
        directive: 'spacer',
        lines: getSpacerLinesFromClassList(node.classList),
      }
    }
  }

  return null
}

export function registerLayoutDirectiveClipboardMatchers(editor: Quill): void {
  editor.clipboard.addMatcher('div', (node) => {
    if (!(node instanceof Element)) {
      return new Delta()
    }

    const value = parseDirectiveFromNode(node)
    if (!value) {
      return new Delta()
    }

    return new Delta().insert({ [LAYOUT_DIRECTIVE_BLOT_NAME]: value })
  })
}
