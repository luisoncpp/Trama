import { useMemo } from 'preact/hooks'
import type Quill from 'quill'
import { findTagMatchesInText, filterMatchesOutsideCode, type TagMatch } from './rich-markdown-editor-tag-helpers'

export interface TagOverlayMatch extends TagMatch {
  bounds: { top: number; left: number; width: number; height: number } | null
}

export interface UseTagOverlayParams {
  editorRef: { current: Quill | null }
  tagIndex: Record<string, string> | null
  ctrlPressed: boolean
}

export function buildTagOverlayMatches(editor: Quill, tagIndex: Record<string, string>): TagOverlayMatch[] {
  const text = editor.getText()
  const allMatches = findTagMatchesInText(text, tagIndex)
  const filteredMatches = filterMatchesOutsideCode(text, allMatches)

  const matchesWithBounds: TagOverlayMatch[] = []
  for (const match of filteredMatches) {
    const bounds = editor.getBounds(match.start, match.end - match.start)
    matchesWithBounds.push({
      ...match,
      bounds,
    })
  }

  return matchesWithBounds
}

export function useTagOverlay({ editorRef, tagIndex, ctrlPressed }: UseTagOverlayParams): TagOverlayMatch[] {
  const matches = useMemo(() => {
    if (!tagIndex || Object.keys(tagIndex).length === 0) {
      return []
    }

    const editor = editorRef.current
    if (!editor) {
      return []
    }

    return buildTagOverlayMatches(editor, tagIndex)
  }, [editorRef.current, tagIndex, ctrlPressed])

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
