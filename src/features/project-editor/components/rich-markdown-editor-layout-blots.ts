import Quill from 'quill'

export type LayoutDirectiveEmbedType = 'center' | 'spacer' | 'pagebreak' | 'unknown'

export interface LayoutDirectiveEmbedValue {
  directive: LayoutDirectiveEmbedType
  role?: 'start' | 'end'
  lines?: number
  raw?: string
}

export const LAYOUT_DIRECTIVE_BLOT_NAME = 'trama-directive'

const MIN_SPACER_LINES = 1
const MAX_SPACER_LINES = 12

type QuillBlockEmbedCtor = {
  new (...args: unknown[]): { domNode?: HTMLElement }
  create: (value?: unknown) => HTMLElement
}

const QuillBlockEmbed = Quill.import('blots/block/embed') as unknown as QuillBlockEmbedCtor

function parseSafeSpacerLines(rawLines: string | null): number {
  const parsed = Number.parseInt(rawLines ?? '1', 10)
  if (Number.isInteger(parsed) && parsed >= MIN_SPACER_LINES && parsed <= MAX_SPACER_LINES) {
    return parsed
  }

  return 1
}

function setBaseDirectiveAttributes(node: HTMLElement): void {
  node.classList.add('trama-layout-directive')
  node.setAttribute('contenteditable', 'false')
  node.setAttribute('aria-hidden', 'true')
  // Keep a non-empty text node so Turndown runs custom rules instead of blank fallback.
  node.textContent = '\u2060'
}

class LayoutDirectiveBlot extends QuillBlockEmbed {
  static blotName = LAYOUT_DIRECTIVE_BLOT_NAME
  static tagName = 'div'
  static className = 'trama-layout-directive'

  static create(value?: unknown): HTMLElement {
    const node = super.create() as HTMLElement
    const safeValue = (value ?? {}) as LayoutDirectiveEmbedValue
    const directive = safeValue.directive ?? 'unknown'
    setBaseDirectiveAttributes(node)
    node.setAttribute('data-trama-directive', directive)

    if (directive === 'center') {
      node.classList.add('trama-center-boundary')
      const role = safeValue.role === 'end' ? 'end' : 'start'
      node.setAttribute('data-trama-role', role)
      return node
    }

    if (directive === 'spacer') {
      node.classList.add('trama-spacer')
      node.setAttribute('data-trama-lines', String(safeValue.lines ?? 1))
      return node
    }

    if (directive === 'pagebreak') {
      node.classList.add('trama-pagebreak')
      return node
    }

    node.classList.add('trama-directive-unknown')
    node.setAttribute('data-trama-raw', safeValue.raw ?? '')
    return node
  }

  static value(domNode: HTMLElement): LayoutDirectiveEmbedValue {
    const directive = domNode.getAttribute('data-trama-directive')

    if (directive === 'center') {
      const role = domNode.getAttribute('data-trama-role') === 'end' ? 'end' : 'start'
      return { directive, role }
    }

    if (directive === 'spacer') {
      return {
        directive,
        lines: parseSafeSpacerLines(domNode.getAttribute('data-trama-lines')),
      }
    }

    if (directive === 'pagebreak') {
      return { directive }
    }

    if (directive === 'unknown') {
      return {
        directive,
        raw: domNode.getAttribute('data-trama-raw') ?? '',
      }
    }

    return {
      directive: 'unknown',
      raw: domNode.getAttribute('data-trama-raw') ?? '',
    }
  }
}

let isLayoutDirectiveBlotRegistered = false

export function registerLayoutDirectiveBlots(): void {
  if (isLayoutDirectiveBlotRegistered) {
    return
  }

  Quill.register(`formats/${LAYOUT_DIRECTIVE_BLOT_NAME}`, LayoutDirectiveBlot, true)
  isLayoutDirectiveBlotRegistered = true
}
