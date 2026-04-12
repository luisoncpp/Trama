import type { TagOverlayMatch } from './rich-markdown-editor-tag-overlay'

interface TagHighlightsProps {
  tagMatches: TagOverlayMatch[]
  offsetTop: number
  offsetLeft: number
}

export function TagHighlights({ tagMatches, offsetTop, offsetLeft }: TagHighlightsProps) {
  return (
    <>
      {tagMatches.map((match, i) =>
        match.bounds ? (
          <div
            key={i}
            class="tag-link-highlight"
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: `${Math.max(0, offsetTop + match.bounds.top + match.bounds.height - 2)}px`,
              left: `${Math.max(0, offsetLeft + match.bounds.left)}px`,
              width: `${match.bounds.width}px`,
              height: '2px',
              pointerEvents: 'none',
            }}
          />
        ) : null
      )}
    </>
  )
}
