import Quill from 'quill'

export function resolveTextOffsetToDomPosition(root: Node, offset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let traversed = 0
  let lastTextNode: Text | null = null

  let current = walker.nextNode()
  while (current) {
    if (current instanceof Text) {
      lastTextNode = current
      const next = traversed + current.data.length
      if (offset <= next) {
        return { node: current, offset: Math.max(0, offset - traversed) }
      }

      traversed = next
    }

    current = walker.nextNode()
  }

  if (!lastTextNode) {
    return null
  }

  return { node: lastTextNode, offset: lastTextNode.data.length }
}

export function measureInlineBounds(
  lineNode: HTMLElement,
  editorRoot: HTMLElement,
  startOffset: number,
  endOffset: number,
): { left: number; top: number; width: number; height: number } | null {
  const start = resolveTextOffsetToDomPosition(lineNode, startOffset)
  const end = resolveTextOffsetToDomPosition(lineNode, endOffset)
  if (!start || !end) {
    return null
  }

  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  const rect = range.getBoundingClientRect()
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null
  }

  const rootRect = editorRoot.getBoundingClientRect()
  return {
    left: rect.left - rootRect.left + editorRoot.scrollLeft,
    top: rect.top - rootRect.top + editorRoot.scrollTop,
    width: rect.width,
    height: rect.height,
  }
}

export function findSentenceBoundaries(text: string, cursorOffset: number): { start: number; end: number } {
  const limit = Math.max(0, Math.min(cursorOffset, text.length))
  const sentenceSeparator = /[.!?。！？]/

  let start = 0
  for (let index = limit - 1; index >= 0; index -= 1) {
    if (sentenceSeparator.test(text[index])) {
      start = index + 1
      break
    }
  }

  while (start < text.length && /\s/.test(text[start])) {
    start += 1
  }

  let end = text.length
  for (let index = limit; index < text.length; index += 1) {
    if (sentenceSeparator.test(text[index])) {
      end = index + 1
      break
    }
  }

  if (end <= start) {
    return { start: 0, end: text.length }
  }

  return { start, end }
}

export function findVisualLineBoundaries(
  quill: Quill,
  selectionIndex: number,
  lineStartIndex: number,
  lineTextLength: number,
): { start: number; end: number } {
  if (lineTextLength <= 0) {
    return { start: 0, end: 0 }
  }

  const lineEndIndex = lineStartIndex + lineTextLength
  const maxAnchor = Math.max(lineStartIndex, lineEndIndex - 1)
  let anchorIndex = Math.min(Math.max(selectionIndex, lineStartIndex), maxAnchor)

  let anchorBounds = quill.getBounds(anchorIndex, 1)
  if (!anchorBounds || anchorBounds.width <= 0 || anchorBounds.height <= 0) {
    anchorIndex = Math.max(lineStartIndex, anchorIndex - 1)
    anchorBounds = quill.getBounds(anchorIndex, 1)
  }

  if (!anchorBounds || anchorBounds.width <= 0 || anchorBounds.height <= 0) {
    return { start: 0, end: lineTextLength }
  }

  const sameLineTolerance = 1
  const anchorTop = anchorBounds.top

  let startIndex = anchorIndex
  while (startIndex > lineStartIndex) {
    const previous = startIndex - 1
    const bounds = quill.getBounds(previous, 1)
    if (!bounds || Math.abs(bounds.top - anchorTop) > sameLineTolerance) {
      break
    }

    startIndex = previous
  }

  let endIndex = anchorIndex + 1
  while (endIndex < lineEndIndex) {
    const bounds = quill.getBounds(endIndex, 1)
    if (!bounds || Math.abs(bounds.top - anchorTop) > sameLineTolerance) {
      break
    }

    endIndex += 1
  }

  return {
    start: startIndex - lineStartIndex,
    end: endIndex - lineStartIndex,
  }
}
