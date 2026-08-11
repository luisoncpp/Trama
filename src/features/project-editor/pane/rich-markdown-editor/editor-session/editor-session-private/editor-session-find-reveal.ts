// @Architecture(descriptionShort="Find match reveal helpers: scroll to active match without stealing find-bar focus")
import type Quill from 'quill'
import { computeCenteredScrollTop } from '../../../../document-contents/index.js'
import { mapPlainTextIndexToQuillIndex } from './editor-session-tag-math'

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

function scrollBoundsIntoView(container: HTMLElement, bounds: { top: number; height: number }): void {
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight
  const matchTop = bounds.top
  const matchBottom = matchTop + bounds.height

  if (matchTop < viewTop) {
    container.scrollTop = matchTop
    return
  }

  if (matchBottom > viewBottom) {
    container.scrollTop = matchBottom - container.clientHeight
  }
}

function scrollToMatchBounds(
  host: HTMLDivElement,
  editor: Quill,
  quillIndex: number,
  quillLength: number,
): void {
  const effectiveLength = Math.max(1, quillLength)
  const bounds = editor.getBounds(quillIndex, effectiveLength)
  if (!bounds) {
    return
  }

  const container = host.querySelector('.ql-container')
  const editorRoot = host.querySelector('.ql-editor')
  if (!(container instanceof HTMLElement)) {
    return
  }

  if (editorRoot instanceof HTMLElement && editorRoot.classList.contains('is-focus-mode')) {
    const pad = Math.max(0, Math.round(container.clientHeight / 2 - bounds.height / 2))
    editorRoot.style.setProperty('--focus-extra-top', `${pad}px`)
    editorRoot.style.setProperty('--focus-extra-bottom', `${pad}px`)
    requestAnimationFrame(() => {
      const refreshed = editor.getBounds(quillIndex, effectiveLength) ?? bounds
      container.scrollTop = computeCenteredScrollTop(container, refreshed)
    })
    return
  }

  scrollBoundsIntoView(container, bounds)
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
    container.scrollTop = computeCenteredScrollTop(container, refreshed)
    if (selection) {
      editor.setSelection(selection.index, selection.length, 'silent')
    }
  })
}

export function revealActiveMatch(
  host: HTMLDivElement,
  editor: Quill,
  state: SearchLikeState,
  options: { findBarFocused: boolean },
): void {
  const plainStart = state.matches[state.activeMatch]
  const plainLength = state.query.trim().length
  const { index: quillIndex, length: quillLength } = toQuillRange(editor, plainStart, plainLength)

  if (options.findBarFocused) {
    scrollToMatchBounds(host, editor, quillIndex, quillLength)
    return
  }

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
}
