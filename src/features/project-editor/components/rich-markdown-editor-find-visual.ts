import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type { FindMatchBounds } from './rich-markdown-editor-find-overlay'
import { mapPlainTextIndexToQuillIndex } from './rich-markdown-editor-tag-overlay'

interface SearchLikeState {
  query: string
  matches: number[]
  activeMatch: number
}

function toQuillRange(editor: Quill, plainStart: number, plainLength: number): { index: number; length: number } {
  const quillStart = mapPlainTextIndexToQuillIndex(editor, plainStart)
  const quillEnd = mapPlainTextIndexToQuillIndex(editor, plainStart + plainLength)
  return { index: quillStart, length: Math.max(0, quillEnd - quillStart) }
}

export function getActiveMatchBounds(
  host: HTMLDivElement,
  editor: Quill,
  plainIndex: number,
  plainQueryLength: number,
): FindMatchBounds | null {
  const container = host.querySelector('.ql-container')
  if (!(container instanceof HTMLElement)) {
    return null
  }

  const { index, length } = toQuillRange(editor, plainIndex, plainQueryLength)
  if (length === 0) {
    return null
  }

  const bounds = editor.getBounds(index, length)
  if (!bounds) {
    return null
  }

  const shellRect = host.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  return {
    top: containerRect.top - shellRect.top + bounds.top,
    left: containerRect.left - shellRect.left + bounds.left,
    width: Math.max(18, bounds.width),
    height: Math.max(18, bounds.height),
  }
}

function handleFocusModeMatch(
  container: HTMLElement,
  editorRoot: HTMLElement,
  editor: Quill,
  quillIndex: number,
  quillLength: number,
): void {
  const bounds = editor.getBounds(quillIndex, quillLength)
  if (!bounds) {
    return
  }

  const selection = editor.getSelection()
  const pad = Math.max(0, Math.round(container.clientHeight / 2 - bounds.height / 2))
  editorRoot.style.setProperty('--focus-extra-top', `${pad}px`)
  editorRoot.style.setProperty('--focus-extra-bottom', `${pad}px`)

  requestAnimationFrame(() => {
    const refreshed = editor.getBounds(quillIndex, quillLength) ?? bounds
    const desired = refreshed.top - (container.clientHeight / 2 - refreshed.height / 2)
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
    const target = Math.max(0, Math.min(desired, maxScroll))
    container.scrollTop = Math.round(target)
    if (selection) {
      editor.setSelection(selection.index, selection.length, 'silent')
    }
  })
}

export function useActiveMatchOverlayEffect({
  isOpen,
  state,
  hostRef,
  editorRef,
  keepFindFocus,
}: {
  isOpen: boolean
  state: SearchLikeState
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  keepFindFocus: () => void
}) {
  useEffect(() => {
    if (!isOpen || state.matches.length === 0 || !state.query.trim()) {
      return
    }

    const host = hostRef.current
    const editor = editorRef.current
    if (!host || !editor) {
      return
    }

    const plainStart = state.matches[state.activeMatch]
    const plainLength = state.query.trim().length
    const { index: quillIndex, length: quillLength } = toQuillRange(editor, plainStart, plainLength)
    editor.setSelection(quillIndex, quillLength, 'silent')

    const container = host.querySelector('.ql-container')
    const editorRoot = host.querySelector('.ql-editor')
    if (
      container instanceof HTMLElement &&
      editorRoot instanceof HTMLElement &&
      editorRoot.classList.contains('is-focus-mode')
    ) {
      handleFocusModeMatch(container, editorRoot, editor, quillIndex, Math.max(1, quillLength))
    } else {
      editor.scrollSelectionIntoView()
    }

    keepFindFocus()
  }, [editorRef, hostRef, isOpen, keepFindFocus, state.activeMatch, state.matches, state.query])
}
