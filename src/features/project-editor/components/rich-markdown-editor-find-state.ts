import { useCallback, useRef, useState } from 'preact/hooks'
import type Quill from 'quill'
import { mapPlainTextIndexToQuillIndex } from './rich-markdown-editor-tag-overlay'

export interface SearchState {
  query: string
  matches: number[]
  activeMatch: number
}

export function getDocumentText(editor: Quill): string {
  const length = Math.max(0, editor.getLength() - 1)
  return editor.getText(0, length)
}

export function findAllMatches(text: string, query: string): number[] {
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

export function quillReplaceRange(editor: Quill, plainStart: number, queryLength: number, replacement: string): void {
  const quillStart = mapPlainTextIndexToQuillIndex(editor, plainStart)
  const quillEnd = mapPlainTextIndexToQuillIndex(editor, plainStart + queryLength)
  const rangeLength = Math.max(1, quillEnd - quillStart)
  editor.deleteText(quillStart, rangeLength, 'silent')
  editor.insertText(quillStart, replacement, 'silent')
}

export function useSearchState(editorRef: { current: Quill | null }) {
  const [state, setState] = useState<SearchState>({ query: '', matches: [], activeMatch: 0 })
  const stateRef = useRef(state)
  stateRef.current = state

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

  const setMatches = (query: string, matches: number[], activeMatch: number) => {
    setState({ query, matches, activeMatch })
  }

  const jumpMatch = (direction: 1 | -1) => {
    const current = stateRef.current
    const queryLength = current.query.trim().length
    if (current.matches.length === 0 || queryLength === 0) {
      return
    }

    const next = (current.activeMatch + direction + current.matches.length) % current.matches.length
    setState((previous) => ({ ...previous, activeMatch: next }))
    selectMatch(current.matches, next, queryLength)
  }

  const reset = () => {
    setState({ query: '', matches: [], activeMatch: 0 })
  }

  return { state, updateMatches, setMatches, jumpMatch, reset, selectMatch, stateRef }
}

export function useReplaceActions({
  editorRef,
  stateRef,
  replaceValue,
  keepFindFocus,
  setMatches,
  selectMatch,
}: {
  editorRef: { current: Quill | null }
  stateRef: { current: SearchState }
  replaceValue: string
  keepFindFocus: () => void
  setMatches: (query: string, matches: number[], activeMatch: number) => void
  selectMatch: (matches: number[], activeMatch: number, queryLength: number) => void
}) {
  const replaceCurrent = useCallback(/* replaceCurrent */ () => {
    const editor = editorRef.current
    const current = stateRef.current
    const queryLength = current.query.trim().length
    if (!editor || queryLength === 0 || current.matches.length === 0) return

    const boundedIndex = Math.max(0, Math.min(current.activeMatch, current.matches.length - 1))
    const plainStart = current.matches[boundedIndex]
    quillReplaceRange(editor, plainStart, queryLength, replaceValue)

    const matches = findAllMatches(getDocumentText(editor), current.query)
    const newActive = Math.min(boundedIndex, Math.max(0, matches.length - 1))
    setMatches(current.query, matches, newActive)
    if (matches.length > 0) {
      selectMatch(matches, newActive, queryLength)
    }
    keepFindFocus()
  }, [editorRef, stateRef, replaceValue, keepFindFocus, setMatches, selectMatch] /*Inputs for replaceCurrent*/)

  const replaceAll = useCallback(/* replaceAll */ () => {
    const editor = editorRef.current
    const current = stateRef.current
    const queryLength = current.query.trim().length
    if (!editor || queryLength === 0 || current.matches.length === 0) return

    for (let i = current.matches.length - 1; i >= 0; i--) {
      quillReplaceRange(editor, current.matches[i], queryLength, replaceValue)
    }

    const remaining = findAllMatches(getDocumentText(editor), current.query)
    setMatches(current.query, remaining, 0)
    if (remaining.length > 0) {
      selectMatch(remaining, 0, queryLength)
    }
    keepFindFocus()
  }, [editorRef, stateRef, replaceValue, keepFindFocus, setMatches, selectMatch] /*Inputs for replaceAll*/)

  return { replaceCurrent, replaceAll }
}
