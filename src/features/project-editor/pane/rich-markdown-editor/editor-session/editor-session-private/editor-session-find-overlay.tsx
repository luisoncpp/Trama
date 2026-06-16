interface FindOverlayProps {
  query: string
  matchLabel: string
  inputRef: { current: HTMLInputElement | null }
  activeBounds: FindMatchBounds | null
  replaceMode: boolean
  allowReplace?: boolean
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

function FindInputRow({ query, inputRef, matchLabel, replaceMode, allowReplace, onQueryChange, onClose, onJumpPrevious, onJumpNext, onToggleReplaceMode }: FindOverlayProps) {
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
      <button type="button" class="editor-findbar__button editor-findbar__button--close" onClick={onClose} aria-label="Close find">
        <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      {allowReplace !== false ? (
        <button type="button" class="editor-findbar__button editor-findbar__button--toggle-replace" onClick={onToggleReplaceMode} aria-label={replaceMode ? 'Hide replace' : 'Show replace'}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d={replaceMode ? 'M3 8L6 4L9 8' : 'M3 4L6 8L9 4'} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      ) : null}
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

      <div
        class={`editor-findbar${replaceMode ? ' editor-findbar--replace' : ''}`}
        role="dialog"
        aria-label={replaceMode ? 'Find and replace in document' : 'Find in document'}
        onMouseDown={(event) => { event.stopPropagation() }}
      >
        <FindInputRow {...props} />
        {replaceMode ? <ReplaceInputRow {...props} /> : null}
      </div>
    </>
  )
}
