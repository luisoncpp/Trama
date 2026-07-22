// @Architecture(descriptionShort="Quill heading scan and ordinal-based centered reveal for Contents navigation")
import type Quill from 'quill'
import type { HeadingRevealTarget } from '../../project-editor-types.js'

export interface QuillDocumentHeading {
  index: number
  level: 1 | 2 | 3
  text: string
  type?: 'heading' | 'pagebreak' | 'spacer'
  lines?: number
}

export interface ScanQuillHeadingsOptions {
  includePageBreaks?: boolean
  includeSpacers?: boolean
}

// Re-assert the reveal after layout settles: image hydration can shift layout
// after the first pass and undo the reveal (editor-session-find-visual pattern).
const REVEAL_SETTLE_DELAY_MS = 150
const LAYOUT_DIRECTIVE_BLOT_NAME = 'trama-layout-directive'

export function computeCenteredScrollTop(
  container: HTMLElement,
  bounds: { top: number; height: number },
): number {
  const desired = container.scrollTop + bounds.top - (container.clientHeight / 2 - bounds.height / 2)
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
  return Math.round(Math.max(0, Math.min(desired, maxScroll)))
}

function readDirectiveEmbed(insert: unknown): { directive?: string; lines?: number } | null {
  if (!insert || typeof insert !== 'object') return null
  const rec = insert as Record<string, unknown>
  const target = rec['trama-directive'] ?? rec['trama-layout-directive'] ?? rec['layout-directive'] ?? rec
  if (target && typeof target === 'object') {
    return target as { directive?: string; lines?: number }
  }
  return null
}

export function scanQuillHeadings(
  editor: Quill,
  options?: ScanQuillHeadingsOptions,
): QuillDocumentHeading[] {
  const includePageBreaks = options?.includePageBreaks ?? true
  const includeSpacers = options?.includeSpacers ?? true

  const headings: QuillDocumentHeading[] = []
  let lineStart = 0
  let offset = 0
  let lineText = ''
  let blankCount = 0
  let blankSeqStartIndex = 0
  let skipEmbedNewline = false

  const flushBlankCount = (): void => {
    if (includeSpacers && blankCount >= 2) {
      headings.push({
        index: blankSeqStartIndex,
        level: 1,
        lines: blankCount,
        text: `Spacer (${blankCount} lines)`,
        type: 'spacer',
      })
    }
    blankCount = 0
  }

  for (const op of editor.getContents().ops ?? []) {
    if (typeof op.insert !== 'string') {
      flushBlankCount()
      const dirObj = readDirectiveEmbed(op.insert)
      if (dirObj) {
        if (dirObj.directive === 'pagebreak' && includePageBreaks) {
          headings.push({ index: offset, level: 1, text: 'Page Break', type: 'pagebreak' })
        } else if (dirObj.directive === 'spacer' && includeSpacers) {
          const lines = Number.isInteger(dirObj.lines) && (dirObj.lines ?? 0) >= 1 ? Math.min(12, dirObj.lines ?? 1) : 1
          headings.push({ index: offset, level: 1, lines, text: lines > 1 ? `Spacer (${lines} lines)` : 'Spacer', type: 'spacer' })
        }
      }
      offset += 1
      lineStart = offset
      lineText = ''
      skipEmbedNewline = true
      continue
    }

    let rest = op.insert
    while (rest.length > 0) {
      const newlineAt = rest.indexOf('\n')
      if (newlineAt === -1) {
        lineText += rest
        offset += rest.length
        rest = ''
        continue
      }
      lineText += rest.slice(0, newlineAt)
      const header = op.attributes?.header

      if (header === 1 || header === 2 || header === 3) {
        flushBlankCount()
        skipEmbedNewline = false
        headings.push({ index: lineStart, level: header, text: lineText, type: 'heading' })
      } else if (lineText.trim().length === 0) {
        if (skipEmbedNewline) {
          skipEmbedNewline = false
        } else {
          if (blankCount === 0) {
            blankSeqStartIndex = lineStart
          }
          blankCount += 1
        }
      } else {
        flushBlankCount()
        skipEmbedNewline = false
      }

      offset += newlineAt + 1
      lineStart = offset
      lineText = ''
      rest = rest.slice(newlineAt + 1)
    }
  }

  flushBlankCount()

  return headings
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
  const clampedOrdinal = Math.max(0, Math.min(rawOrdinal, headings.length - 1))
  const headingIndex = headings[clampedOrdinal].index

  revealHeadingIndex(container, editor, headingIndex)
  window.setTimeout(() => {
    if (container.isConnected) {
      revealHeadingIndex(container, editor, headingIndex)
    }
  }, REVEAL_SETTLE_DELAY_MS)
}

