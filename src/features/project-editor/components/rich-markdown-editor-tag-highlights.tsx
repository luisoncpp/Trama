import type Quill from 'quill'
import type { TagMatch } from './rich-markdown-editor-tag-helpers'
import { mapPlainTextIndexToQuillIndex, getTagMatchRects } from './rich-markdown-editor-tag-overlay'

interface TagHighlightsProps {
  matches: TagMatch[]
  editor: Quill
  offsetTop: number
  offsetLeft: number
}

interface ResolvedLine {
  top: number
  left: number
  width: number
  height: number
}

function resolveBounds(editor: Quill, matches: TagMatch[]): ResolvedLine[][] {
  return matches.map((match) => {
    const quillStart = mapPlainTextIndexToQuillIndex(editor, match.start)
    const quillEnd = mapPlainTextIndexToQuillIndex(editor, match.end)
    const matchLength = Math.max(0, quillEnd - quillStart)
    if (matchLength === 0) {
      return []
    }
    return getTagMatchRects(editor, quillStart, quillEnd)
  })
}

export function TagHighlights({ matches, editor, offsetTop, offsetLeft }: TagHighlightsProps) {
  const allBounds = resolveBounds(editor, matches)

  return (
    <>
      {allBounds.map((lines, i) => {
        if (lines.length === 0) return null
        return lines.map((bounds, j) => (
          <div
            key={`${i}-${j}`}
            class="tag-link-highlight"
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: `${Math.max(0, offsetTop + bounds.top + bounds.height - 2)}px`,
              left: `${Math.max(0, offsetLeft + bounds.left)}px`,
              width: `${bounds.width}px`,
              height: '2px',
              pointerEvents: 'none',
            }}
          />
        ))
      })}
    </>
  )
}