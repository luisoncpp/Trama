// @Architecture(descriptionShort="Shared find/replace state helpers: search state hook (`useSearchState`), replace")
import { useCallback, useRef, useState } from 'preact/hooks'
import type Quill from 'quill'
import { DEFAULT_TEXT_SEARCH_OPTIONS, findTextMatches, type TextSearchOptions } from '../../../../../../shared/text-search/index.js'
import { mapPlainTextIndexToQuillIndex } from './editor-session-tag-math'

export interface SearchState {
  query: string
  options: TextSearchOptions
  matches: number[]
  activeMatch: number
}

function getDocumentText(editor: Quill): string {
  const length = Math.max(0, editor.getLength() - 1)
  return editor.getText(0, length)
}

function findAllMatches(text: string, query: string, options: TextSearchOptions): number[] {
  return findTextMatches(text, query, options)
}

function computeRefreshedState(editor: Quill | null, current: SearchState): SearchState | null {
  if (!editor || !current.query.trim()) {
    return null
  }

  const matches = findAllMatches(getDocumentText(editor), current.query, current.options)
  const activeMatch = Math.max(0, Math.min(current.activeMatch, matches.length - 1))
  return { ...current, matches, activeMatch }
}

export function isModF(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f'
}

export function isModH(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'h'
}

export function formatMatchLabel(state: SearchState): string {
  if (!state.query.trim() || state.matches.length === 0) {
    return '0/0'
  }

  return `${state.activeMatch + 1}/${state.matches.length}`
}

function quillReplaceRange(editor: Quill, plainStart: number, queryLength: number, replacement: string): void {
  const quillStart = mapPlainTextIndexToQuillIndex(editor, plainStart)
  const quillEnd = mapPlainTextIndexToQuillIndex(editor, plainStart + queryLength)
  const rangeLength = Math.max(1, quillEnd - quillStart)
  editor.deleteText(quillStart, rangeLength, 'silent')
  editor.insertText(quillStart, replacement, 'silent')
}

export function useSearchState(editorRef: { current: Quill | null }) {
  const [state, setState] = useState<SearchState>({ query: '', options: DEFAULT_TEXT_SEARCH_OPTIONS, matches: [], activeMatch: 0 })
  const stateRef = useRef(state)
  stateRef.current = state

  const updateMatches = (nextQuery: string) => {
    applySearch(nextQuery, stateRef.current.options)
  }

  const applySearch = (nextQuery: string, options: TextSearchOptions) => {
    const editor = editorRef.current
    const matches = editor ? findAllMatches(getDocumentText(editor), nextQuery, options) : []
    setState({ query: nextQuery, options, matches, activeMatch: 0 })
  }

  const refreshMatches = () => {
    // Functional update: a refresh may run in the same effect flush as applySearch
    // (document navigation with the find bar open) and must not clobber it.
    setState((previous) => computeRefreshedState(editorRef.current, previous) ?? previous)
  }

  const setMatches = (query: string, matches: number[], activeMatch: number) => {
    setState((previous) => ({ ...previous, query, matches, activeMatch }))
  }

  // Only update activeMatch here. Reveal/selection belongs to useActiveMatchOverlayEffect
  // via revealActiveMatch — setSelection always DOM-focuses Quill and would steal find-bar focus.
  const jumpMatch = (direction: 1 | -1) => {
    const current = stateRef.current
    const queryLength = current.query.trim().length
    if (current.matches.length === 0 || queryLength === 0) {
      return
    }

    const next = (current.activeMatch + direction + current.matches.length) % current.matches.length
    setState((previous) => ({ ...previous, activeMatch: next }))
  }

  const reset = () => {
    setState((previous) => ({ query: '', options: previous.options, matches: [], activeMatch: 0 }))
  }

  return { state, updateMatches, applySearch, refreshMatches, setMatches, jumpMatch, reset, stateRef }
}

export function useReplaceActions({
  editorRef,
  stateRef,
  replaceValue,
  keepFindFocus,
  setMatches,
}: {
  editorRef: { current: Quill | null }
  stateRef: { current: SearchState }
  replaceValue: string
  keepFindFocus: () => void
  setMatches: (query: string, matches: number[], activeMatch: number) => void
}) {
  const replaceCurrent = useCallback(/* replaceCurrent */ () => {
    const editor = editorRef.current
    const current = stateRef.current
    const queryLength = current.query.trim().length
    if (!editor || queryLength === 0 || current.matches.length === 0) return

    const boundedIndex = Math.max(0, Math.min(current.activeMatch, current.matches.length - 1))
    const plainStart = current.matches[boundedIndex]
    quillReplaceRange(editor, plainStart, queryLength, replaceValue)

    const matches = findAllMatches(getDocumentText(editor), current.query, current.options)
    const newActive = Math.min(boundedIndex, Math.max(0, matches.length - 1))
    setMatches(current.query, matches, newActive)
    keepFindFocus()
  }, [editorRef, stateRef, replaceValue, keepFindFocus, setMatches] /*Inputs for replaceCurrent*/)

  const replaceAll = useCallback(/* replaceAll */ () => {
    const editor = editorRef.current
    const current = stateRef.current
    const queryLength = current.query.trim().length
    if (!editor || queryLength === 0 || current.matches.length === 0) return

    for (let i = current.matches.length - 1; i >= 0; i--) {
      quillReplaceRange(editor, current.matches[i], queryLength, replaceValue)
    }

    const remaining = findAllMatches(getDocumentText(editor), current.query, current.options)
    setMatches(current.query, remaining, 0)
    keepFindFocus()
  }, [editorRef, stateRef, replaceValue, keepFindFocus, setMatches] /*Inputs for replaceAll*/)

  return { replaceCurrent, replaceAll }
}
