// @Architecture(descriptionShort="Find bar lifecycle hooks: shortcuts, scroll bounds, open/close actions, effect wiring")
import { useCallback, useEffect, useState } from 'preact/hooks'
import type Quill from 'quill'
import { getActiveMatchBounds, useActiveMatchOverlayEffect } from './editor-session-find-visual'
import {
  useContentMutatedRefreshEffect,
  useGlobalFindPresetEffect,
  type FindContentSession,
} from './editor-session-find-preset'
import { handleFindReplaceShortcut } from './editor-session-find-focus'
import { useSearchState, type SearchState } from './editor-session-find-state'
import type { FindMatchBounds } from './editor-session-find-overlay'

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
      handleFindReplaceShortcut(event, hostRef.current, editorRef.current, onOpenFind, onOpenReplace)
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
  inputRef,
  isOpen,
  state,
  keepFindFocus,
  editorDisabled,
}: {
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  inputRef: { current: HTMLInputElement | null }
  isOpen: boolean
  state: ReturnType<typeof useSearchState>['state']
  keepFindFocus: () => void
  editorDisabled?: boolean
}) {
  const [, setScrollTick] = useState(0)
  const refreshFindBounds = useCallback(/* refreshFindBounds */ () => {
    setScrollTick((t) => t + 1)
  }, [/*Inputs for refreshFindBounds — stable*/])
  const currentEditor = editorRef.current

  useEffect(/* trackEditorScrollForBounds */ () => {
    if (!isOpen) return
    const container = currentEditor?.container ?? hostRef.current?.querySelector('.ql-container')
    if (!container) return
    const onScroll = () => setScrollTick((t) => t + 1)
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => { container.removeEventListener('scroll', onScroll) }
  }, [currentEditor, isOpen, hostRef] /*Inputs for trackEditorScrollForBounds*/)

  useActiveMatchOverlayEffect({
    isOpen,
    state,
    hostRef,
    editorRef,
    inputRef,
    keepFindFocus,
    refreshFindBounds,
    editorDisabled,
  })
}

export function useFindBarActions({
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

export function computeActiveFindBounds(
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

const noopReplaceHandler = () => undefined

export function resolveFindReplacePresentation(
  readOnlyPreview: boolean,
  replaceMode: boolean,
  replaceCurrent: () => void,
  replaceAll: () => void,
) {
  if (readOnlyPreview) {
    return {
      replaceMode: false,
      allowReplace: false,
      onReplace: noopReplaceHandler,
      onReplaceAll: noopReplaceHandler,
    }
  }

  return {
    replaceMode,
    allowReplace: true,
    onReplace: replaceCurrent,
    onReplaceAll: replaceAll,
  }
}

export function useRichEditorFindEffects({
  documentId,
  closeFind,
  setReplaceValue,
  openFind,
  applySearch,
  isOpen,
  contentSession,
  state,
  stateRef,
  editorDisabled,
  refreshMatches,
  hostRef,
  editorRef,
  inputRef,
  keepFindFocus,
  handleOpenReplace,
}: {
  documentId: string | null
  closeFind: () => void
  setReplaceValue: (value: string) => void
  openFind: () => void
  applySearch: (query: string, options: SearchState['options']) => void
  isOpen: boolean
  contentSession: FindContentSession | null
  state: SearchState
  stateRef: { current: SearchState }
  editorDisabled: boolean
  refreshMatches: () => void
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  inputRef: { current: HTMLInputElement | null }
  keepFindFocus: () => void
  handleOpenReplace: () => void
}) {
  useEffect(/* resetFindOnDocumentChange */ () => { closeFind(); setReplaceValue('') }, [documentId] /*Inputs for resetFindOnDocumentChange*/)

  useGlobalFindPresetEffect({ documentId, openFind, applySearch })
  useContentMutatedRefreshEffect({
    isOpen, contentSession, documentId, query: state.query, options: state.options, editorDisabled,
    hasQuery: () => Boolean(stateRef.current.query.trim()), refreshMatches,
  })
  useFindShortcutEffect({ hostRef, editorRef, onOpenFind: openFind, onOpenReplace: handleOpenReplace })
  useFindLifecycle({ hostRef, editorRef, inputRef, isOpen, state, keepFindFocus, editorDisabled })
}
