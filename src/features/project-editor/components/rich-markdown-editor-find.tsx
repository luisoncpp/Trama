import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type Quill from 'quill'
import { FindOverlay, type FindMatchBounds } from './rich-markdown-editor-find-overlay'
import { getActiveMatchBounds, useActiveMatchOverlayEffect } from './rich-markdown-editor-find-visual'
import { mapPlainTextIndexToQuillIndex } from './rich-markdown-editor-tag-overlay'

interface UseRichEditorFindParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
}

interface SearchState {
  query: string
  matches: number[]
  activeMatch: number
}

function getDocumentText(editor: Quill): string {
  const length = Math.max(0, editor.getLength() - 1)
  return editor.getText(0, length)
}

function findAllMatches(text: string, query: string): number[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return []
  }

  const normalizedText = text.toLocaleLowerCase()
  const matches: number[] = []
  let from = 0

  while (from < normalizedText.length) {
    const index = normalizedText.indexOf(normalizedQuery, from)
    if (index < 0) {
      break
    }

    matches.push(index)
    from = index + normalizedQuery.length
  }

  return matches
}

function isModF(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f'
}

function useSearchState(editorRef: { current: Quill | null }) {
  const [state, setState] = useState<SearchState>({ query: '', matches: [], activeMatch: 0 })

  const selectMatch = (matches: number[], activeMatch: number, queryLength: number) => {
    const editor = editorRef.current
    if (!editor || matches.length === 0 || queryLength <= 0) {
      return
    }

    const boundedIndex = Math.max(0, Math.min(activeMatch, matches.length - 1))
    const plainStart = matches[boundedIndex]
    const quillStart = mapPlainTextIndexToQuillIndex(editor, plainStart)
    const quillEnd = mapPlainTextIndexToQuillIndex(editor, plainStart + queryLength)
    editor.setSelection(quillStart, Math.max(0, quillEnd - quillStart), 'silent')
  }

  const updateMatches = (nextQuery: string) => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const matches = findAllMatches(getDocumentText(editor), nextQuery)
    setState({ query: nextQuery, matches, activeMatch: 0 })
  }

  const jumpMatch = (direction: 1 | -1) => {
    const queryLength = state.query.trim().length
    if (state.matches.length === 0 || queryLength === 0) {
      return
    }

    const next = (state.activeMatch + direction + state.matches.length) % state.matches.length
    setState((previous) => ({ ...previous, activeMatch: next }))
    selectMatch(state.matches, next, queryLength)
  }

  const reset = () => {
    setState({ query: '', matches: [], activeMatch: 0 })
  }

  return { state, updateMatches, jumpMatch, reset }
}

function useFindShortcutEffect({
  hostRef,
  editorRef,
  onOpen,
}: {
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  onOpen: () => void
}) {
  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (!isModF(event)) {
        return
      }

      const host = hostRef.current
      const target = event.target
      const insideEditor = host != null && target instanceof Node && host.contains(target)
      if (!insideEditor && !editorRef.current?.hasFocus()) {
        return
      }

      event.preventDefault()
      onOpen()
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [editorRef, hostRef, onOpen])
}

function formatMatchLabel(state: SearchState): string {
  if (!state.query.trim() || state.matches.length === 0) {
    return '0/0'
  }

  return `${state.activeMatch + 1}/${state.matches.length}`
}

export function useRichEditorFind({ documentId, hostRef, editorRef }: UseRichEditorFindParams) {
  const [isOpen, setIsOpen] = useState(false)
  const [scrollTick, setScrollTick] = useState(0)
  const { state, updateMatches, jumpMatch, reset } = useSearchState(editorRef)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const matchLabel = useMemo(() => formatMatchLabel(state), [state])

  const openFind = () => {
    setIsOpen(true)
    window.setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }

  const closeFind = () => { setIsOpen(false) }
  const keepFindFocus = useCallback(() => window.setTimeout(() => inputRef.current?.focus(), 0), [])
  const jumpPrevious = useCallback(() => {
    jumpMatch(-1)
    keepFindFocus()
  }, [jumpMatch, keepFindFocus])
  const jumpNext = useCallback(() => {
    jumpMatch(1)
    keepFindFocus()
  }, [jumpMatch, keepFindFocus])

  useEffect(() => { setIsOpen(false); reset() }, [documentId])

  useEffect(() => {
    if (!isOpen) return
    const container = hostRef.current?.querySelector('.ql-container')
    if (!container) return
    const onScroll = () => setScrollTick((t) => t + 1)
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => { container.removeEventListener('scroll', onScroll) }
  }, [isOpen, hostRef])

  useFindShortcutEffect({ hostRef, editorRef, onOpen: openFind })
  useActiveMatchOverlayEffect({
    isOpen,
    state,
    hostRef,
    editorRef,
    keepFindFocus,
  })

  let activeBounds: FindMatchBounds | null = null
  if (isOpen && state.matches.length > 0 && state.query.trim()) {
    const host = hostRef.current
    const editor = editorRef.current
    if (host && editor) {
      const index = state.matches[state.activeMatch]
      const queryLength = state.query.trim().length
      activeBounds = getActiveMatchBounds(host, editor, index, queryLength)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <FindOverlay
      query={state.query}
      matchLabel={matchLabel}
      inputRef={inputRef}
      activeBounds={activeBounds}
      onQueryChange={updateMatches}
      onClose={closeFind}
      onJumpPrevious={jumpPrevious}
      onJumpNext={jumpNext}
    />
  )
}
