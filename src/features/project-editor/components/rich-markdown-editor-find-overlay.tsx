interface FindOverlayProps {
  query: string
  matchLabel: string
  inputRef: { current: HTMLInputElement | null }
  activeBounds: FindMatchBounds | null
  onQueryChange: (value: string) => void
  onClose: () => void
  onJumpPrevious: () => void
  onJumpNext: () => void
}

export interface FindMatchBounds {
  top: number
  left: number
  width: number
  height: number
}

export function FindOverlay({ query, matchLabel, inputRef, activeBounds, onQueryChange, onClose, onJumpPrevious, onJumpNext }: FindOverlayProps) {
  return (
    <>
      {activeBounds ? (
        <div
          class="editor-find-highlight"
          aria-hidden="true"
          style={{
            top: `${activeBounds.top}px`,
            left: `${activeBounds.left}px`,
            width: `${activeBounds.width}px`,
            height: `${activeBounds.height}px`,
          }}
        />
      ) : null}

      <div class="editor-findbar" role="dialog" aria-label="Find in document">
        <input
          ref={inputRef}
          type="text"
          class="editor-findbar__input"
          placeholder="Find in document"
          value={query}
          onInput={(event) => onQueryChange((event.currentTarget as HTMLInputElement).value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onClose()
            }

            if (event.key === 'Enter') {
              event.preventDefault()
              if (event.shiftKey) {
                onJumpPrevious()
                return
              }

              onJumpNext()
            }
          }}
        />

        <span class="editor-findbar__count" aria-live="polite">{matchLabel}</span>
        <button type="button" class="editor-findbar__button" onClick={onJumpPrevious} aria-label="Previous match">Prev</button>
        <button type="button" class="editor-findbar__button" onClick={onJumpNext} aria-label="Next match">Next</button>
        <button type="button" class="editor-findbar__button editor-findbar__button--close" onClick={onClose} aria-label="Close find">Close</button>
      </div>
    </>
  )
}
