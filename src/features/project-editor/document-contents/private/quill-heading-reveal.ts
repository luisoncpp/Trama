// @Architecture(descriptionShort="Quill heading scan and ordinal-based centered reveal for Contents navigation")
import type Quill from 'quill'
import type { HeadingRevealTarget } from '../../project-editor-types.js'

export interface QuillDocumentHeading {
  index: number
  level: 1 | 2 | 3
  text: string
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

export function scanQuillHeadings(editor: Quill): QuillDocumentHeading[] {
  const headings: QuillDocumentHeading[] = []
  let lineStart = 0
  let offset = 0
  let lineText = ''

  for (const op of editor.getContents().ops ?? []) {
    if (typeof op.insert !== 'string') {
      offset += 1
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
        headings.push({ index: lineStart, level: header, text: lineText })
      }
      offset += newlineAt + 1
      lineStart = offset
      lineText = ''
      rest = rest.slice(newlineAt + 1)
    }
  }

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
