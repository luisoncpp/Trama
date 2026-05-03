interface FindOverlayProps {
  query: string
  matchLabel: string
  inputRef: { current: HTMLInputElement | null }
  activeBounds: FindMatchBounds | null
  replaceMode: boolean
  replaceValue: string
  onQueryChange: (value: string) => void
  onReplaceValueChange: (value: string) => void
  onClose: () => void
  onJumpPrevious: () => void
  onJumpNext: () => void
  onReplace: () => void
  onReplaceAll: () => void
  onToggleReplaceMode: () => void
}

export interface FindMatchBounds {
  top: number
  left: number
  width: number
  height: number
}

function FindInputRow({ query, inputRef, matchLabel, replaceMode, onQueryChange, onClose, onJumpPrevious, onJumpNext, onToggleReplaceMode }: FindOverlayProps) {
  return (
    <div class="editor-findbar__row">
      <input
        ref={inputRef}
        type="text"
        class="editor-findbar__input"
        placeholder="Find"
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
      <button type="button" class="editor-findbar__button editor-findbar__button--toggle-replace" onClick={onToggleReplaceMode} aria-label={replaceMode ? 'Hide replace' : 'Show replace'}>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d={replaceMode ? 'M3 8L6 4L9 8' : 'M3 4L6 8L9 4'} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>
  )
}

function ReplaceInputRow({ replaceValue, onReplaceValueChange, onReplace, onReplaceAll }: Pick<FindOverlayProps, 'replaceValue' | 'onReplaceValueChange' | 'onReplace' | 'onReplaceAll'>) {
  return (
    <div class="editor-findbar__row">
      <input
        type="text"
        class="editor-findbar__input"
        placeholder="Replace"
        value={replaceValue}
        onInput={(event) => onReplaceValueChange((event.currentTarget as HTMLInputElement).value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onReplace()
          }
        }}
      />
      <button type="button" class="editor-findbar__button" onClick={onReplace} aria-label="Replace current match">Replace</button>
      <button type="button" class="editor-findbar__button" onClick={onReplaceAll} aria-label="Replace all matches">Replace All</button>
    </div>
  )
}

export function FindOverlay(props: FindOverlayProps) {
  const { activeBounds, replaceMode } = props

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

      <div class={`editor-findbar${replaceMode ? ' editor-findbar--replace' : ''}`} role="dialog" aria-label={replaceMode ? 'Find and replace in document' : 'Find in document'}>
        <FindInputRow {...props} />
        {replaceMode ? <ReplaceInputRow {...props} /> : null}
      </div>
    </>
  )
}
