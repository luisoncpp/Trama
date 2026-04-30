import type Quill from 'quill'
import { findTagMatchesInText, filterMatchesOutsideCode, type TagMatch } from './rich-markdown-editor-tag-helpers'

export interface TagOverlayMatch extends TagMatch {
  bounds: { top: number; left: number; width: number; height: number } | null
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

export function buildTagOverlayMatches(editor: Quill, tagIndex: Record<string, string>): TagOverlayMatch[] {
  const text = editor.getText()
  const allMatches = findTagMatchesInText(text, tagIndex)
  const filteredMatches = filterMatchesOutsideCode(text, allMatches)

  const matchesWithBounds: TagOverlayMatch[] = []
  for (const match of filteredMatches) {
    const quillStart = mapPlainTextIndexToQuillIndex(editor, match.start)
    const quillEnd = mapPlainTextIndexToQuillIndex(editor, match.end)
    const matchLength = Math.max(0, quillEnd - quillStart)
    if (matchLength === 0) {
      continue
    }

    const bounds = editor.getBounds(quillStart, matchLength)
    matchesWithBounds.push({
      ...match,
      bounds,
    })
  }

  return matchesWithBounds
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

    const bounds = editor.getBounds(quillStart, matchLength)
    result.push({ ...match, bounds })
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
    if (!match.bounds) continue

    const matchLeft = editorRect.left + match.bounds.left - hitPadding
    const matchRight = matchLeft + match.bounds.width + hitPadding * 2
    const matchTop = editorRect.top + match.bounds.top - hitPadding
    const matchBottom = matchTop + match.bounds.height + hitPadding * 2

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
  return null
}
