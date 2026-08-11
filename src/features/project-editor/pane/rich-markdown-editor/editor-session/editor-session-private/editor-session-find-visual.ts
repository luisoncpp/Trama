// @Architecture(descriptionShort="Active-match visual sync helpers: computes Quill bounds and keeps highlighted match")
import type Quill from 'quill'
import type { FindMatchBounds } from './editor-session-find-overlay'
import { mapPlainTextIndexToQuillIndex } from './editor-session-tag-math'

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

export { useActiveMatchOverlayEffect } from './editor-session-find-overlay-effect'
