import type { TagOverlayMatch } from './rich-markdown-editor-tag-overlay'

interface TagHighlightsProps {
  tagMatches: TagOverlayMatch[]
}

export function TagHighlights({ tagMatches }: TagHighlightsProps) {
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
              top: `${match.bounds.top}px`,
              left: `${match.bounds.left}px`,
              width: `${match.bounds.width}px`,
              height: `${match.bounds.height}px`,
              pointerEvents: 'none',
            }}
          />
        ) : null
      )}
    </>
  )
}
