import type Quill from 'quill'
import { findTagMatchesInText, filterMatchesOutsideCode, type TagMatch } from './rich-markdown-editor-tag-helpers'

export interface TagOverlayMatch extends TagMatch {
  rects: Array<{ top: number; left: number; width: number; height: number }>
}

export interface UseTagOverlayParams {
  editorRef: { current: Quill | null }
  tagIndex: Record<string, string> | null
  ctrlPressed: boolean
  tagOverlayRecalcRef: { current: boolean }
  tagOverlayMatchesRef: { current: TagMatch[] }
}

export function useTagOverlay({ editorRef, tagIndex, ctrlPressed, tagOverlayRecalcRef, tagOverlayMatchesRef }: UseTagOverlayParams): TagMatch[] {
  const editor = editorRef.current
  if (!editor || !tagIndex || Object.keys(tagIndex).length === 0) {
    return []
  }

  if (ctrlPressed) {
    // Only recalculate if dirty or first time (empty matches and no dirty flag set yet)
    const needsRecalc = tagOverlayRecalcRef.current || tagOverlayMatchesRef.current.length === 0
    if (needsRecalc) {
      const text = editor.getText()
      const allMatches = findTagMatchesInText(text, tagIndex)
      tagOverlayMatchesRef.current = filterMatchesOutsideCode(text, allMatches)
      tagOverlayRecalcRef.current = false
    }
  }

  return tagOverlayMatchesRef.current
}

interface DeltaOp {
  insert?: string | Record<string, unknown>
}

export function mapPlainTextIndexToQuillIndex(editor: Quill, plainTextIndex: number): number {
  const ops = (editor.getContents()?.ops ?? []) as DeltaOp[]
  const target = Math.max(0, plainTextIndex)

  let plainOffset = 0
  let quillOffset = 0

  for (const op of ops) {
    if (typeof op.insert === 'string') {
      const segment = op.insert
      const remaining = target - plainOffset

      if (remaining < segment.length) {
        return quillOffset + remaining
      }

      plainOffset += segment.length
      quillOffset += segment.length
      continue
    }

    quillOffset += 1
  }

  return quillOffset
}

export function getTagMatchRects(
  editor: Quill,
  quillStart: number,
  quillEnd: number,
): Array<{ top: number; left: number; width: number; height: number }> {
  const scroll = (editor as unknown as {
    scroll?: {
      leaf(index: number): [any | null, number]
      line(index: number): [any | null, number]
      length(): number
    }
  }).scroll
  const container = (editor as unknown as { container?: HTMLElement }).container

  if (!scroll || !container) {
    const bounds = editor.getBounds(quillStart, Math.max(0, quillEnd - quillStart))
    return bounds ? [{ top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }] : []
  }

  const scrollLength = scroll.length()
  const index = Math.min(quillStart, scrollLength - 1)
  const length = Math.min(quillEnd, scrollLength - 1) - index
  if (length <= 0) return []

  let [leaf, offset] = scroll.leaf(index)
  if (leaf == null) return []

  // Replicate Quill getBounds logic: if at end of leaf and length > 0, move to next leaf
  if (length > 0 && offset === leaf.length()) {
    const [next] = scroll.leaf(index + 1)
    if (next) {
      const [line] = scroll.line(index)
      const [nextLine] = scroll.line(index + 1)
      if (line === nextLine) {
        leaf = next
        offset = 0
      }
    }
  }

  try {
    const [startNode, startOffset] = leaf.position(offset, true)
    const range = document.createRange()
    range.setStart(startNode, startOffset)

    let [endLeaf, endOffset] = scroll.leaf(index + length)
    if (endLeaf == null) return []
    const [endNode, endNodeOffset] = endLeaf.position(endOffset, true)
    range.setEnd(endNode, endNodeOffset)

    const containerRect = container.getBoundingClientRect()
    const clientRects = range.getClientRects()
    const rects: Array<{ top: number; left: number; width: number; height: number }> = []
    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i]
      if (r.width > 0 && r.height > 0) {
        rects.push({
          top: r.top - containerRect.top,
          left: r.left - containerRect.left,
          width: r.width,
          height: r.height,
        })
      }
    }
    if (rects.length > 0) return rects
  } catch {
    // fallback to getBounds
  }

  const bounds = editor.getBounds(quillStart, Math.max(0, quillEnd - quillStart))
  if (bounds) {
    return [{ top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }]
  }
  return []
}

export function buildTagOverlayMatches(editor: Quill, tagIndex: Record<string, string>): TagOverlayMatch[] {
  const text = editor.getText()
  const allMatches = findTagMatchesInText(text, tagIndex)
  const filteredMatches = filterMatchesOutsideCode(text, allMatches)

  const matchesWithRects: TagOverlayMatch[] = []
  for (const match of filteredMatches) {
    const quillStart = mapPlainTextIndexToQuillIndex(editor, match.start)
    const quillEnd = mapPlainTextIndexToQuillIndex(editor, match.end)
    const matchLength = Math.max(0, quillEnd - quillStart)
    if (matchLength === 0) {
      continue
    }

    const rects = getTagMatchRects(editor, quillStart, quillEnd)
    matchesWithRects.push({
      ...match,
      rects,
    })
  }

  return matchesWithRects
}

export function resolveTagBounds(editor: Quill, matches: TagMatch[]): TagOverlayMatch[] {
  const result: TagOverlayMatch[] = []
  for (const match of matches) {
    const quillStart = mapPlainTextIndexToQuillIndex(editor, match.start)
    const quillEnd = mapPlainTextIndexToQuillIndex(editor, match.end)
    const matchLength = Math.max(0, quillEnd - quillStart)
    if (matchLength === 0) {
      continue
    }

    const rects = getTagMatchRects(editor, quillStart, quillEnd)
    result.push({ ...match, rects })
  }
  return result
}

export function findMatchAtPosition(
  overlays: TagOverlayMatch[],
  clientX: number,
  clientY: number,
  editorRect: DOMRect,
  hitPadding = 3,
): TagMatch | null {
  for (const match of overlays) {
    if (match.rects.length === 0) continue

    for (const rect of match.rects) {
      const matchLeft = editorRect.left + rect.left - hitPadding
      const matchRight = matchLeft + rect.width + hitPadding * 2
      const matchTop = editorRect.top + rect.top - hitPadding
      const matchBottom = matchTop + rect.height + hitPadding * 2

      if (
        clientX >= matchLeft &&
        clientX <= matchRight &&
        clientY >= matchTop &&
        clientY <= matchBottom
      ) {
        return {
          tag: match.tag,
          start: match.start,
          end: match.end,
          filePath: match.filePath,
        }
      }
    }
  }
  return null
}
