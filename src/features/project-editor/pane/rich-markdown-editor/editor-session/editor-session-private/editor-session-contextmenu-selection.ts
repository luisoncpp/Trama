// @Architecture(descriptionShort="Preserves Quill selection across native contextmenu when BlockEmbed ranges collapse")
import type Quill from 'quill'

type QuillRange = { index: number; length: number }

type QuillSelectionInternal = {
  lastRange: QuillRange | null
  savedRange: QuillRange
}

function rangesEqual(a: QuillRange | null, b: QuillRange): boolean {
  return a != null && a.index === b.index && a.length === b.length
}

function getSelectionInternal(editor: Quill): QuillSelectionInternal {
  return (editor as unknown as { selection: QuillSelectionInternal }).selection
}

/** Live Quill range that drives the highlight (`lastRange` only). */
export function readLiveQuillRange(editor: Quill): QuillRange | null {
  const range = getSelectionInternal(editor).lastRange
  if (!range || range.length <= 0) return null
  return { index: range.index, length: range.length }
}

/**
 * Best stash candidate without calling getSelection() (which re-syncs from native).
 * Prefer live lastRange; fall back to savedRange when native already collapsed.
 */
export function readStableQuillRange(editor: Quill): QuillRange | null {
  const live = readLiveQuillRange(editor)
  if (live) return live
  const saved = getSelectionInternal(editor).savedRange
  if (!saved || saved.length <= 0) return null
  return { index: saved.index, length: saved.length }
}

const RESTORE_GRACE_MS = 100

type PreserveState = {
  pending: QuillRange | null
  restoreTimer: ReturnType<typeof setTimeout> | null
}

function clearPending(state: PreserveState): void {
  state.pending = null
  if (state.restoreTimer != null) {
    clearTimeout(state.restoreTimer)
    state.restoreTimer = null
  }
}

function applyStashed(editor: Quill, state: PreserveState): boolean {
  const stashed = state.pending
  if (!stashed) return false
  if (rangesEqual(readLiveQuillRange(editor), stashed)) return false
  editor.setSelection(stashed.index, stashed.length, 'silent')
  return true
}

function scheduleRestoreWindow(editor: Quill, state: PreserveState): void {
  if (state.restoreTimer != null) clearTimeout(state.restoreTimer)
  // Cover Quill mouseup sync and Electron await+menu.popup focus ticks.
  state.restoreTimer = setTimeout(() => {
    applyStashed(editor, state)
    state.pending = null
    state.restoreTimer = null
  }, RESTORE_GRACE_MS)
}

function stashFromStableRange(editor: Quill, state: PreserveState): void {
  const range = readStableQuillRange(editor)
  if (!range) {
    clearPending(state)
    return
  }
  state.pending = range
  scheduleRestoreWindow(editor, state)
}

/**
 * Native right-click can collapse the browser selection when the Quill range
 * includes contenteditable=false BlockEmbeds (e.g. center:start at index 0).
 * Quill then re-reads a null/collapsed native range on mouseup and drops the highlight.
 * Capture a stable Quill range on right-mousedown/contextmenu and restore across
 * Quill's sync and Electron's async menu.popup.
 */
export function registerContextMenuSelectionPreserve(editor: Quill): () => void {
  const state: PreserveState = { pending: null, restoreTimer: null }

  const onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 2) return
    stashFromStableRange(editor, state)
  }
  const onContextMenu = (): void => {
    stashFromStableRange(editor, state)
  }
  const onSelectionChange = (range: QuillRange | null): void => {
    if (!state.pending) return
    if (range != null && range.length > 0) return
    applyStashed(editor, state)
  }

  editor.root.addEventListener('mousedown', onMouseDown)
  editor.root.addEventListener('contextmenu', onContextMenu)
  editor.on('selection-change', onSelectionChange)

  return () => {
    clearPending(state)
    editor.root.removeEventListener('mousedown', onMouseDown)
    editor.root.removeEventListener('contextmenu', onContextMenu)
    editor.off('selection-change', onSelectionChange)
  }
}
