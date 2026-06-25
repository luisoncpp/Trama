// @Architecture(descriptionShort="Registers Quill `BlockEmbed`-based layout directive blots (`center`, `spacer`,")
import Quill from 'quill'
import { LAYOUT_DIRECTIVE_BLOT_NAME, type LayoutDirectiveEmbedValue } from './layout-directive-types'

const MIN_SPACER_LINES = 1
const MAX_SPACER_LINES = 12

type QuillBlockEmbedCtor = {
  new (...args: unknown[]): { domNode?: HTMLElement }
  create: (value?: unknown) => HTMLElement
}

let isLayoutDirectiveBlotRegistered = false

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
  node.textContent = '\u2060'
}

function applyCenterAttributes(node: HTMLElement, safeValue: LayoutDirectiveEmbedValue): void {
  node.classList.add('trama-center-boundary')
  const role = safeValue.role === 'end' ? 'end' : 'start'
  node.setAttribute('data-trama-role', role)
}

function applySpacerAttributes(node: HTMLElement, safeValue: LayoutDirectiveEmbedValue): void {
  node.classList.add('trama-spacer')
  node.setAttribute('data-trama-lines', String(safeValue.lines ?? 1))
}

function applyPagebreakAttributes(node: HTMLElement): void {
  node.classList.add('trama-pagebreak')
}

function applyBrokenImageAttributes(node: HTMLElement, safeValue: LayoutDirectiveEmbedValue): void {
  node.classList.add('trama-broken-image-placeholder')
  node.setAttribute('data-trama-broken-image-alt', safeValue.alt ?? '')
  node.setAttribute('data-trama-broken-image-source', safeValue.source ?? '')
  node.setAttribute('aria-label', safeValue.alt?.trim() || 'Broken image')
  node.textContent = '🖼️'
}

function applyUnknownAttributes(node: HTMLElement, safeValue: LayoutDirectiveEmbedValue): void {
  node.classList.add('trama-directive-unknown')
  node.setAttribute('data-trama-raw', safeValue.raw ?? '')
}

function buildDirectiveNode(node: HTMLElement, safeValue: LayoutDirectiveEmbedValue): HTMLElement {
  const directive = safeValue.directive ?? 'unknown'
  setBaseDirectiveAttributes(node)
  node.setAttribute('data-trama-directive', directive)

  if (directive === 'center') {
    applyCenterAttributes(node, safeValue)
    return node
  }

  if (directive === 'spacer') {
    applySpacerAttributes(node, safeValue)
    return node
  }

  if (directive === 'pagebreak') {
    applyPagebreakAttributes(node)
    return node
  }

  if (directive === 'broken-image') {
    applyBrokenImageAttributes(node, safeValue)
    return node
  }

  applyUnknownAttributes(node, safeValue)
  return node
}

function readCenterValue(domNode: HTMLElement): LayoutDirectiveEmbedValue {
  const role = domNode.getAttribute('data-trama-role') === 'end' ? 'end' : 'start'
  return { directive: 'center', role }
}

function readSpacerValue(domNode: HTMLElement): LayoutDirectiveEmbedValue {
  return {
    directive: 'spacer',
    lines: parseSafeSpacerLines(domNode.getAttribute('data-trama-lines')),
  }
}

function readBrokenImageValue(domNode: HTMLElement): LayoutDirectiveEmbedValue {
  return {
    directive: 'broken-image',
    alt: domNode.getAttribute('data-trama-broken-image-alt') ?? '',
    source: domNode.getAttribute('data-trama-broken-image-source') ?? '',
  }
}

function readUnknownValue(domNode: HTMLElement): LayoutDirectiveEmbedValue {
  return {
    directive: 'unknown',
    raw: domNode.getAttribute('data-trama-raw') ?? '',
  }
}

function readDirectiveValue(domNode: HTMLElement): LayoutDirectiveEmbedValue {
  const directive = domNode.getAttribute('data-trama-directive')

  if (directive === 'center') return readCenterValue(domNode)
  if (directive === 'spacer') return readSpacerValue(domNode)
  if (directive === 'pagebreak') return { directive }
  if (directive === 'broken-image') return readBrokenImageValue(domNode)
  if (directive === 'unknown') return readUnknownValue(domNode)

  return readUnknownValue(domNode)
}

function createLayoutDirectiveBlot(QuillBlockEmbed: QuillBlockEmbedCtor): typeof QuillBlockEmbed {
  class LayoutDirectiveBlot extends QuillBlockEmbed {
    static blotName = LAYOUT_DIRECTIVE_BLOT_NAME
    static tagName = 'div'
    static className = 'trama-layout-directive'

    static create(value?: unknown): HTMLElement {
      const node = super.create() as HTMLElement
      return buildDirectiveNode(node, (value ?? {}) as LayoutDirectiveEmbedValue)
    }

    static value(domNode: HTMLElement): LayoutDirectiveEmbedValue {
      return readDirectiveValue(domNode)
    }
  }

  return LayoutDirectiveBlot as unknown as typeof QuillBlockEmbed
}

export function registerLayoutDirectiveBlots(): void {
  if (isLayoutDirectiveBlotRegistered) {
    return
  }

  const QuillBlockEmbed = Quill.import('blots/block/embed') as unknown as QuillBlockEmbedCtor
  const LayoutDirectiveBlot = createLayoutDirectiveBlot(QuillBlockEmbed)
  Quill.register(`formats/${LAYOUT_DIRECTIVE_BLOT_NAME}`, LayoutDirectiveBlot, true)
  isLayoutDirectiveBlotRegistered = true
}
