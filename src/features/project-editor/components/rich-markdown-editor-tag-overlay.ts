import { useMemo } from 'preact/hooks'
import type Quill from 'quill'
import { findTagMatchesInText, filterMatchesOutsideCode, type TagMatch } from './rich-markdown-editor-tag-helpers'

export interface TagOverlayMatch extends TagMatch {
  bounds: { top: number; left: number; width: number; height: number } | null
}

export interface UseTagOverlayParams {
  editorRef: { current: Quill | null }
  tagIndex: Record<string, string> | null
}

interface DeltaOp {
  insert?: string | Record<string, unknown>
}

function mapPlainTextIndexToQuillIndex(editor: Quill, plainTextIndex: number): number {
  const ops = (editor.getContents()?.ops ?? []) as DeltaOp[]
  const target = Math.max(0, plainTextIndex)

  let plainOffset = 0
  let quillOffset = 0

  for (const op of ops) {
    if (typeof op.insert === 'string') {
      const segment = op.insert
      const remaining = target - plainOffset

      if (remaining <= segment.length) {
        return quillOffset + remaining
      }

      plainOffset += segment.length
      quillOffset += segment.length
      continue
    }

    // Quill counts embeds as one document unit, while getText() does not include them.
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

export function useTagOverlay({ editorRef, tagIndex }: UseTagOverlayParams): TagOverlayMatch[] {
  const matches = useMemo(() => {
    if (!tagIndex || Object.keys(tagIndex).length === 0) {
      return []
    }

    const editor = editorRef.current
    if (!editor) {
      return []
    }

    return buildTagOverlayMatches(editor, tagIndex)
  }, [editorRef.current, tagIndex])

  return matches
}

export function findMatchAtPosition(
  matches: TagOverlayMatch[],
  clientX: number,
  clientY: number,
  editorRect: DOMRect,
  hitPadding = 3,
): TagMatch | null {
  for (const match of matches) {
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
