import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type Quill from 'quill'
import { FindOverlay, type FindMatchBounds } from './rich-markdown-editor-find-overlay'
import { getActiveMatchBounds, useActiveMatchOverlayEffect } from './rich-markdown-editor-find-visual'
import {
  isModF,
  isModH,
  formatMatchLabel,
  useSearchState,
  useReplaceActions,
} from './rich-markdown-editor-find-state'

interface UseRichEditorFindParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
}

function useFindShortcutEffect({
  hostRef,
  editorRef,
  onOpenFind,
  onOpenReplace,
}: {
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  onOpenFind: () => void
  onOpenReplace: () => void
}) {
  useEffect(/* listenFindReplaceShortcuts */ () => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      const host = hostRef.current
      const target = event.target
      const insideEditor = host != null && target instanceof Node && host.contains(target)
      if (!insideEditor && !editorRef.current?.hasFocus()) {
        return
      }

      if (isModF(event)) {
        event.preventDefault()
        onOpenFind()
        return
      }

      if (isModH(event)) {
        event.preventDefault()
        onOpenReplace()
        return
      }
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [editorRef, hostRef, onOpenFind, onOpenReplace] /*Inputs for listenFindReplaceShortcuts*/)
}

function useFindLifecycle({
  hostRef,
  editorRef,
  isOpen,
  state,
  keepFindFocus,
}: {
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  isOpen: boolean
  state: ReturnType<typeof useSearchState>['state']
  keepFindFocus: () => void
}) {
  const [, setScrollTick] = useState(0)

  useEffect(/* trackEditorScrollForBounds */ () => {
    if (!isOpen) return
    const container = hostRef.current?.querySelector('.ql-container')
    if (!container) return
    const onScroll = () => setScrollTick((t) => t + 1)
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => { container.removeEventListener('scroll', onScroll) }
  }, [isOpen, hostRef] /*Inputs for trackEditorScrollForBounds*/)

  useActiveMatchOverlayEffect({
    isOpen,
    state,
    hostRef,
    editorRef,
    keepFindFocus,
  })
}

function useFindBarActions({
  inputRef,
  jumpMatch,
  keepFindFocus,
}: {
  inputRef: { current: HTMLInputElement | null }
  jumpMatch: (direction: 1 | -1) => void
  keepFindFocus: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [replaceMode, setReplaceMode] = useState(false)

  const openFindWithMode = useCallback(/* openFindWithMode */ (withReplace: boolean) => {
    setIsOpen(true)
    setReplaceMode(withReplace)
    window.setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }, [/*Inputs for openFindWithMode — stable*/])

  const openFind = useCallback(/* openFind */ () => openFindWithMode(false), [openFindWithMode] /*Inputs for openFind*/)
  const openReplace = useCallback(/* openReplace */ () => openFindWithMode(true), [openFindWithMode] /*Inputs for openReplace*/)
  const closeFind = useCallback(/* closeFind */ () => { setIsOpen(false); setReplaceMode(false) }, [/*Inputs for closeFind — stable*/])

  const toggleReplaceMode = useCallback(/* toggleReplaceMode */ () => {
    setReplaceMode((prev) => !prev)
    keepFindFocus()
  }, [keepFindFocus] /*Inputs for toggleReplaceMode*/)

  const jumpPrevious = useCallback(/* jumpPrevious */ () => {
    jumpMatch(-1)
    keepFindFocus()
  }, [jumpMatch, keepFindFocus] /*Inputs for jumpPrevious*/)
  const jumpNext = useCallback(/* jumpNext */ () => {
    jumpMatch(1)
    keepFindFocus()
  }, [jumpMatch, keepFindFocus] /*Inputs for jumpNext*/)

  return { isOpen, replaceMode, openFind, openReplace, closeFind, toggleReplaceMode, jumpPrevious, jumpNext }
}

export function useRichEditorFind({ documentId, hostRef, editorRef }: UseRichEditorFindParams) {
  const [replaceValue, setReplaceValue] = useState('')
  const { state, updateMatches, setMatches, jumpMatch, selectMatch, stateRef } = useSearchState(editorRef)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const matchLabel = useMemo(/* formatMatchLabel */ () => formatMatchLabel(state), [state] /*Inputs for formatMatchLabel*/)
  const keepFindFocus = useCallback(/* keepFindFocus */ () => window.setTimeout(() => inputRef.current?.focus(), 0), [/*Inputs for keepFindFocus — stable*/])

  const { isOpen, replaceMode, openFind, openReplace, closeFind, toggleReplaceMode, jumpPrevious, jumpNext } =
    useFindBarActions({ inputRef, jumpMatch, keepFindFocus })

  const { replaceCurrent, replaceAll } = useReplaceActions({
    editorRef, stateRef, replaceValue, keepFindFocus, setMatches, selectMatch,
  })

  useEffect(/* resetFindOnDocumentChange */ () => { closeFind(); setReplaceValue('') }, [documentId] /*Inputs for resetFindOnDocumentChange*/)

  useFindShortcutEffect({ hostRef, editorRef, onOpenFind: openFind, onOpenReplace: openReplace })
  useFindLifecycle({ hostRef, editorRef, isOpen, state, keepFindFocus })

  let activeBounds: FindMatchBounds | null = null
  if (isOpen && state.matches.length > 0 && state.query.trim()) {
    const host = hostRef.current
    const editor = editorRef.current
    if (host && editor) {
      activeBounds = getActiveMatchBounds(host, editor, state.matches[state.activeMatch], state.query.trim().length)
    }
  }

  if (!isOpen) return null

  return (
    <FindOverlay
      query={state.query}
      matchLabel={matchLabel}
      inputRef={inputRef}
      activeBounds={activeBounds}
      replaceMode={replaceMode}
      replaceValue={replaceValue}
      onQueryChange={updateMatches}
      onReplaceValueChange={setReplaceValue}
      onClose={closeFind}
      onJumpPrevious={jumpPrevious}
      onJumpNext={jumpNext}
      onReplace={replaceCurrent}
      onReplaceAll={replaceAll}
      onToggleReplaceMode={toggleReplaceMode}
    />
  )
}
