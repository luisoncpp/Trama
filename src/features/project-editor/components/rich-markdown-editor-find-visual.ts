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
    editor.scrollSelectionIntoView()
    onBoundsChange(getActiveMatchBounds(host, editor, index, queryLength))
    keepFindFocus()
  }, [editorRef, hostRef, isOpen, keepFindFocus, onBoundsChange, state.activeMatch, state.matches, state.query])
}
