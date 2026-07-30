// @Architecture(descriptionShort="Quill heading scan and ordinal-based centered reveal for Contents navigation")
import type Quill from 'quill'
import type { HeadingRevealTarget } from '../../project-editor-types.js'
import { normalizeDirectiveLabel } from '../../../../shared/markdown-layout-directive-label.js'

export interface QuillDocumentHeading {
  index: number
  level: 1 | 2 | 3
  text: string
  type?: 'heading' | 'pagebreak' | 'spacer'
  lines?: number
  label?: string
  ordinal: number
  sourceLength?: number
  isBlankLineSpacer?: boolean
}

export interface ScanQuillHeadingsOptions {
  includePageBreaks?: boolean
  includeSpacers?: boolean
}

interface QuillHeadingScanState {
  headings: QuillDocumentHeading[]
  lineStart: number
  offset: number
  lineText: string
  blankCount: number
  blankSeqStartIndex: number
  skipEmbedNewline: boolean
  nextOrdinal: number
  includePageBreaks: boolean
  includeSpacers: boolean
}

// Re-assert the reveal after layout settles: image hydration can shift layout
// after the first pass and undo the reveal (editor-session-find-visual pattern).
const REVEAL_SETTLE_DELAY_MS = 150

export function computeCenteredScrollTop(
  container: HTMLElement,
  bounds: { top: number; height: number },
): number {
  const desired = container.scrollTop + bounds.top - (container.clientHeight / 2 - bounds.height / 2)
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
  return Math.round(Math.max(0, Math.min(desired, maxScroll)))
}

function readDirectiveEmbed(insert: unknown): { directive?: string; lines?: number; label?: string } | null {
  if (!insert || typeof insert !== 'object') return null
  const rec = insert as Record<string, unknown>
  const target = rec['trama-directive'] ?? rec['trama-layout-directive'] ?? rec['layout-directive'] ?? rec
  if (target && typeof target === 'object') {
    return target as { directive?: string; lines?: number; label?: string }
  }
  return null
}

function appendHeading(state: QuillHeadingScanState, item: Omit<QuillDocumentHeading, 'ordinal'>, included: boolean): void {
  const withOrdinal = { ...item, ordinal: state.nextOrdinal }
  state.nextOrdinal += 1
  if (included) state.headings.push(withOrdinal)
}

function flushBlankLines(state: QuillHeadingScanState): void {
  if (state.blankCount >= 2) {
    appendHeading(state, {
      index: state.blankSeqStartIndex,
      level: 1,
      lines: state.blankCount,
      text: `Spacer (${state.blankCount} lines)`,
      type: 'spacer',
      sourceLength: state.blankCount,
      isBlankLineSpacer: true,
    }, state.includeSpacers)
  }
  state.blankCount = 0
}

function appendDirectiveEmbed(state: QuillHeadingScanState, insert: unknown): void {
  const directive = readDirectiveEmbed(insert)
  if (directive?.directive === 'pagebreak') {
    const label = normalizeDirectiveLabel(directive.label)
    appendHeading(state, {
      index: state.offset,
      level: 1,
      ...(label ? { label } : {}),
      text: label ?? 'Page Break',
      type: 'pagebreak',
      sourceLength: 1,
    }, state.includePageBreaks)
  } else if (directive?.directive === 'spacer') {
    const lines = Number.isInteger(directive.lines) && (directive.lines ?? 0) >= 1 ? Math.min(12, directive.lines ?? 1) : 1
    const label = normalizeDirectiveLabel(directive.label)
    appendHeading(state, {
      index: state.offset,
      level: 1,
      lines,
      ...(label ? { label } : {}),
      text: label ?? (lines > 1 ? `Spacer (${lines} lines)` : 'Spacer'),
      type: 'spacer',
      sourceLength: 1,
    }, state.includeSpacers)
  }
}

function finishTextLine(state: QuillHeadingScanState, header: unknown): void {
  if (header === 1 || header === 2 || header === 3) {
    flushBlankLines(state)
    state.skipEmbedNewline = false
    appendHeading(state, { index: state.lineStart, level: header, text: state.lineText, type: 'heading' }, true)
  } else if (state.lineText.trim().length === 0) {
    if (state.skipEmbedNewline) state.skipEmbedNewline = false
    else {
      if (state.blankCount === 0) state.blankSeqStartIndex = state.lineStart
      state.blankCount += 1
    }
  } else {
    flushBlankLines(state)
    state.skipEmbedNewline = false
  }
}

function scanTextInsert(state: QuillHeadingScanState, insert: string, header: unknown): void {
  let rest = insert
  while (rest.length > 0) {
    const newlineAt = rest.indexOf('\n')
    if (newlineAt === -1) {
      state.lineText += rest
      state.offset += rest.length
      return
    }
    state.lineText += rest.slice(0, newlineAt)
    finishTextLine(state, header)
    state.offset += newlineAt + 1
    state.lineStart = state.offset
    state.lineText = ''
    rest = rest.slice(newlineAt + 1)
  }
}

export function scanQuillHeadings(
  editor: Quill,
  options?: ScanQuillHeadingsOptions,
): QuillDocumentHeading[] {
  const state: QuillHeadingScanState = {
    headings: [], lineStart: 0, offset: 0, lineText: '', blankCount: 0, blankSeqStartIndex: 0,
    skipEmbedNewline: false, nextOrdinal: 0,
    includePageBreaks: options?.includePageBreaks ?? true,
    includeSpacers: options?.includeSpacers ?? true,
  }
  for (const op of editor.getContents().ops ?? []) {
    if (typeof op.insert !== 'string') {
      flushBlankLines(state)
      appendDirectiveEmbed(state, op.insert)
      state.offset += 1
      state.lineStart = state.offset
      state.lineText = ''
      state.skipEmbedNewline = true
      continue
    }
    scanTextInsert(state, op.insert, op.attributes?.header)
  }
  flushBlankLines(state)
  return state.headings
}

function revealHeadingIndex(container: HTMLElement, editor: Quill, index: number): void {
  editor.setSelection(index, 0, 'silent')
  if (editor.isEnabled()) {
    editor.focus({ preventScroll: true })
  }
  const bounds = editor.getBounds(index, 1)
  if (bounds) {
    const targetScrollTop = computeCenteredScrollTop(container, bounds)
    // Temporary diagnostic: remove after the heading-navigation fix is confirmed.
    console.debug('[DocumentContents] reveal heading', {
      index,
      boundsTop: bounds.top,
      scrollTopBefore: container.scrollTop,
      targetScrollTop,
    })
    container.scrollTop = targetScrollTop
  }
}

export function revealQuillHeading(host: HTMLDivElement, editor: Quill, target: HeadingRevealTarget): void {
  const container = host.querySelector('.ql-container')
  if (!(container instanceof HTMLElement)) {
    return
  }
  const headings = scanQuillHeadings(editor)
  if (headings.length === 0) {
    return
  }
  const rawOrdinal = Number.isFinite(target.ordinal) ? Math.trunc(target.ordinal) : 0
  const clampedOrdinal = Math.max(0, Math.min(rawOrdinal, headings[headings.length - 1].ordinal))
  const headingIndex = headings.find((heading) => heading.ordinal === clampedOrdinal)?.index
    ?? headings[headings.length - 1].index

  revealHeadingIndex(container, editor, headingIndex)
  window.setTimeout(() => {
    if (container.isConnected) {
      revealHeadingIndex(container, editor, headingIndex)
    }
  }, REVEAL_SETTLE_DELAY_MS)
}
