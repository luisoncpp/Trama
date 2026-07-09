// @Architecture(descriptionShort="In-document find controller; suppresses replace affordances during read-only revision")
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type Quill from 'quill'
import { FindOverlay, type FindMatchBounds } from './editor-session-find-overlay'
import { getActiveMatchBounds, useActiveMatchOverlayEffect } from './editor-session-find-visual'
import {
  buildToggleFindOption,
  useContentMutatedRefreshEffect,
  useGlobalFindPresetEffect,
  type FindContentSession,
} from './editor-session-find-preset'
import {
  isModF,
  isModH,
  formatMatchLabel,
  useSearchState,
  useReplaceActions,
  type SearchState,
} from './editor-session-find-state'

interface UseRichEditorFindParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  readOnlyPreview?: boolean
  contentSession?: FindContentSession | null
  editorDisabled?: boolean
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
  editorDisabled,
}: {
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  isOpen: boolean
  state: ReturnType<typeof useSearchState>['state']
  keepFindFocus: () => void
  editorDisabled?: boolean
}) {
  const [, setScrollTick] = useState(0)
  const refreshFindBounds = useCallback(/* refreshFindBounds */ () => {
    setScrollTick((t) => t + 1)
  }, [/*Inputs for refreshFindBounds — stable*/])

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
    refreshFindBounds,
    editorDisabled,
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

function computeActiveFindBounds(
  isOpen: boolean,
  state: SearchState,
  hostRef: { current: HTMLDivElement | null },
  editorRef: { current: Quill | null },
): FindMatchBounds | null {
  if (!isOpen || state.matches.length === 0 || !state.query.trim()) return null
  const host = hostRef.current
  const editor = editorRef.current
  if (!host || !editor) return null
  return getActiveMatchBounds(host, editor, state.matches[state.activeMatch], state.query.trim().length)
}

export function useRichEditorFind({ documentId, hostRef, editorRef, readOnlyPreview = false, contentSession = null, editorDisabled = false }: UseRichEditorFindParams) {
  const [replaceValue, setReplaceValue] = useState('')
  const { state, updateMatches, applySearch, refreshMatches, setMatches, jumpMatch, selectMatch, stateRef } = useSearchState(editorRef)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const matchLabel = useMemo(/* formatMatchLabel */ () => formatMatchLabel(state), [state] /*Inputs for formatMatchLabel*/)
  const keepFindFocus = useCallback(/* keepFindFocus */ () => window.setTimeout(() => inputRef.current?.focus(), 0), [/*Inputs for keepFindFocus — stable*/])

  const { isOpen, replaceMode, openFind, openReplace, closeFind, toggleReplaceMode, jumpPrevious, jumpNext } =
    useFindBarActions({ inputRef, jumpMatch, keepFindFocus })
  const handleOpenReplace = readOnlyPreview ? openFind : openReplace

  const { replaceCurrent, replaceAll } = useReplaceActions({
    editorRef, stateRef, replaceValue, keepFindFocus, setMatches, selectMatch,
  })

  useEffect(/* resetFindOnDocumentChange */ () => { closeFind(); setReplaceValue('') }, [documentId] /*Inputs for resetFindOnDocumentChange*/)

  useGlobalFindPresetEffect({ documentId, openFind, applySearch })
  useContentMutatedRefreshEffect({
    isOpen, contentSession, documentId, query: state.query, options: state.options, editorDisabled,
    hasQuery: () => Boolean(stateRef.current.query.trim()), refreshMatches,
  })
  const toggleFindOption = buildToggleFindOption({ stateRef, applySearch, keepFindFocus })

  useFindShortcutEffect({ hostRef, editorRef, onOpenFind: openFind, onOpenReplace: handleOpenReplace })
  useFindLifecycle({ hostRef, editorRef, isOpen, state, keepFindFocus, editorDisabled })

  const activeBounds = computeActiveFindBounds(isOpen, state, hostRef, editorRef)

  if (!isOpen) return null

  return (
    <FindOverlay
      query={state.query}
      matchLabel={matchLabel}
      inputRef={inputRef}
      activeBounds={activeBounds}
      replaceMode={replaceMode && !readOnlyPreview}
      allowReplace={!readOnlyPreview}
      replaceValue={replaceValue}
      caseSensitive={state.options.caseSensitive}
      wholeWord={state.options.wholeWord}
      onToggleCaseSensitive={() => toggleFindOption('caseSensitive')}
      onToggleWholeWord={() => toggleFindOption('wholeWord')}
      onQueryChange={updateMatches}
      onReplaceValueChange={setReplaceValue}
      onClose={closeFind}
      onJumpPrevious={jumpPrevious}
      onJumpNext={jumpNext}
      onReplace={readOnlyPreview ? () => undefined : replaceCurrent}
      onReplaceAll={readOnlyPreview ? () => undefined : replaceAll}
      onToggleReplaceMode={toggleReplaceMode}
    />
  )
}
