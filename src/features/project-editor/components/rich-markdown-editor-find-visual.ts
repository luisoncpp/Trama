import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type { FindMatchBounds } from './rich-markdown-editor-find-overlay'

interface SearchLikeState {
  query: string
  matches: number[]
  activeMatch: number
}

function getActiveMatchBounds(
  host: HTMLDivElement,
  editor: Quill,
  index: number,
  queryLength: number,
): FindMatchBounds | null {
  const container = host.querySelector('.ql-container')
  if (!(container instanceof HTMLElement)) {
    return null
  }

  const bounds = editor.getBounds(index, queryLength)
  if (!bounds) {
    console.error('Could not get bounds for active match')
    return null
  }

  return {
    top: container.offsetTop + bounds.top,
    left: container.offsetLeft + bounds.left,
    width: Math.max(18, bounds.width),
    height: Math.max(18, bounds.height),
  }
}

export function useActiveMatchOverlayEffect({
  isOpen,
  state,
  hostRef,
  editorRef,
  keepFindFocus,
  onBoundsChange,
}: {
  isOpen: boolean
  state: SearchLikeState
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  keepFindFocus: () => void
  onBoundsChange: (bounds: FindMatchBounds | null) => void
}) {
  useEffect(() => {
    if (!isOpen || state.matches.length === 0 || !state.query.trim()) {
      onBoundsChange(null)
      return
    }

    const host = hostRef.current
    const editor = editorRef.current
    if (!host || !editor) {
      onBoundsChange(null)
      return
    }

    const index = state.matches[state.activeMatch]
    const queryLength = state.query.trim().length
    editor.setSelection(index, queryLength, 'silent')

    const container = host.querySelector('.ql-container')
    const editorRoot = host.querySelector('.ql-editor')
    if (container instanceof HTMLElement && editorRoot instanceof HTMLElement && editorRoot.classList.contains('is-focus-mode')) {
      const length = Math.max(1, queryLength)
      const bounds = editor.getBounds(index, length)
      if (bounds) {
        const pad = Math.max(0, Math.round(container.clientHeight / 2 - bounds.height / 2))
        editorRoot.style.setProperty('--focus-extra-top', `${pad}px`)
        editorRoot.style.setProperty('--focus-extra-bottom', `${pad}px`)

        requestAnimationFrame(() => {
          const refreshed = editor.getBounds(index, length) ?? bounds
          const desired = refreshed.top - (container.clientHeight / 2 - refreshed.height / 2)
          const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
          const target = Math.max(0, Math.min(desired, maxScroll))
          container.scrollTop = Math.round(target)
        })
      }
    } else {
      editor.scrollSelectionIntoView()
    }

    onBoundsChange(getActiveMatchBounds(host, editor, index, queryLength))
    keepFindFocus()
  }, [editorRef, hostRef, isOpen, keepFindFocus, onBoundsChange, state.activeMatch, state.matches, state.query])
}
