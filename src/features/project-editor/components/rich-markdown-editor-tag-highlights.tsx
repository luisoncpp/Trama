import type Quill from 'quill'
import type { TagMatch } from './rich-markdown-editor-tag-helpers'
import { mapPlainTextIndexToQuillIndex } from './rich-markdown-editor-tag-overlay'

interface TagHighlightsProps {
  matches: TagMatch[]
  editor: Quill
  offsetTop: number
  offsetLeft: number
}

interface ResolvedBounds {
  top: number
  left: number
  width: number
  height: number
}

function resolveBounds(editor: Quill, matches: TagMatch[]): ResolvedBounds[] {
  return matches.map((match) => {
    const quillStart = mapPlainTextIndexToQuillIndex(editor, match.start)
    const quillEnd = mapPlainTextIndexToQuillIndex(editor, match.end)
    const matchLength = Math.max(0, quillEnd - quillStart)
    if (matchLength === 0) {
      return { top: 0, left: 0, width: 0, height: 0 }
    }
    const b = editor.getBounds(quillStart, matchLength)
    return b ?? { top: 0, left: 0, width: 0, height: 0 }
  })
}

export function TagHighlights({ matches, editor, offsetTop, offsetLeft }: TagHighlightsProps) {
  const allBounds = resolveBounds(editor, matches)

  return (
    <>
      {allBounds.map((bounds, i) => {
        if (!bounds.width) return null
        return (
          <div
            key={i}
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
        )
      })}
    </>
  )
}