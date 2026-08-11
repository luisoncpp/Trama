// @Architecture(descriptionShort="Active-match overlay effect: reveals matches without stealing focus")
import { useEffect, useRef } from 'preact/hooks'
import type Quill from 'quill'
import { isEditorBodyFocused, isFindBarFocused } from './editor-session-find-focus'
import { revealActiveMatch } from './editor-session-find-reveal'

interface SearchLikeState {
  query: string
  matches: number[]
  activeMatch: number
}

const REVEAL_SETTLE_DELAY_MS = 150

function shouldRefreshActiveMatchOnly(
  hostRef: { current: HTMLDivElement | null },
  inputRef: { current: HTMLInputElement | null },
  queryChanged: boolean,
  editorBecameEnabled: boolean,
): boolean {
  return (
    isEditorBodyFocused(hostRef, inputRef) &&
    !isFindBarFocused(inputRef) &&
    !queryChanged &&
    !editorBecameEnabled
  )
}

function runActiveMatchReveal({
  host,
  editor,
  state,
  hostRef,
  inputRef,
  queryChanged,
  editorBecameEnabled,
  keepFindFocus,
  refreshFindBounds,
}: {
  host: HTMLDivElement
  editor: Quill
  state: SearchLikeState
  hostRef: { current: HTMLDivElement | null }
  inputRef: { current: HTMLInputElement | null }
  queryChanged: boolean
  editorBecameEnabled: boolean
  keepFindFocus: () => void
  refreshFindBounds: () => void
}): void {
  refreshFindBounds()
  if (shouldRefreshActiveMatchOnly(hostRef, inputRef, queryChanged, editorBecameEnabled)) {
    return
  }

  const findBarFocused = isFindBarFocused(inputRef)
  revealActiveMatch(host, editor, state, { findBarFocused })
  if (findBarFocused) {
    keepFindFocus()
  }
}

function scheduleActiveMatchReveal({
  hostRef,
  editorRef,
  inputRef,
  state,
  queryChanged,
  editorBecameEnabled,
  keepFindFocus,
  refreshFindBounds,
}: {
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  inputRef: { current: HTMLInputElement | null }
  state: SearchLikeState
  queryChanged: boolean
  editorBecameEnabled: boolean
  keepFindFocus: () => void
  refreshFindBounds: () => void
}): number {
  const reveal = () => {
    const host = hostRef.current
    const editor = editorRef.current
    if (!host || !editor) return
    runActiveMatchReveal({ host, editor, state, hostRef, inputRef, queryChanged, editorBecameEnabled, keepFindFocus, refreshFindBounds })
  }

  reveal()
  return window.setTimeout(reveal, REVEAL_SETTLE_DELAY_MS)
}

export function useActiveMatchOverlayEffect({
  isOpen,
  state,
  hostRef,
  editorRef,
  inputRef,
  keepFindFocus,
  refreshFindBounds,
  editorDisabled = false,
}: {
  isOpen: boolean
  state: SearchLikeState
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  inputRef: { current: HTMLInputElement | null }
  keepFindFocus: () => void
  refreshFindBounds: () => void
  editorDisabled?: boolean
}) {
  const previousQueryRef = useRef(state.query)
  const previousEditorDisabledRef = useRef(editorDisabled)

  useEffect(() => {
    if (!isOpen || state.matches.length === 0 || !state.query.trim()) {
      return
    }

    const queryChanged = previousQueryRef.current !== state.query
    const editorBecameEnabled = previousEditorDisabledRef.current && !editorDisabled
    previousQueryRef.current = state.query
    previousEditorDisabledRef.current = editorDisabled

    const settleTimer = scheduleActiveMatchReveal({
      hostRef,
      editorRef,
      inputRef,
      state,
      queryChanged,
      editorBecameEnabled,
      keepFindFocus,
      refreshFindBounds,
    })
    return () => {
      window.clearTimeout(settleTimer)
    }
  }, [editorRef, hostRef, inputRef, isOpen, keepFindFocus, refreshFindBounds, state.activeMatch, state.matches, state.query, editorDisabled])
}
