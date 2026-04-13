import type Quill from 'quill'
import { LAYOUT_DIRECTIVE_BLOT_NAME } from './rich-markdown-editor-layout-blots'

interface SelectionRange {
  index: number
  length: number
}

function isPagebreakEmbedAt(editor: Quill, index: number): boolean {
  if (index < 0) {
    return false
  }

  const ops = editor.getContents(index, 1).ops ?? []
  const firstOp = ops[0]
  if (!firstOp || typeof firstOp.insert !== 'object' || firstOp.insert === null) {
    return false
  }

  const insertRecord = firstOp.insert as Record<string, unknown>
  if (!(LAYOUT_DIRECTIVE_BLOT_NAME in insertRecord)) {
    return false
  }

  const directiveValue = insertRecord[LAYOUT_DIRECTIVE_BLOT_NAME]
  if (typeof directiveValue !== 'object' || directiveValue === null) {
    return false
  }

  const embedValue = directiveValue as { directive?: string }
  return embedValue.directive === 'pagebreak'
}

function moveAcrossPagebreakRight(editor: Quill, range: SelectionRange): boolean {
  if (range.length !== 0) {
    return true
  }

  if (!isPagebreakEmbedAt(editor, range.index)) {
    return true
  }

  editor.setSelection(range.index + 1, 0, 'user')
  return false
}

function moveAcrossPagebreakLeft(editor: Quill, range: SelectionRange): boolean {
  if (range.length !== 0 || range.index <= 0) {
    return true
  }

  if (!isPagebreakEmbedAt(editor, range.index - 1)) {
    return true
  }

  editor.setSelection(range.index - 1, 0, 'user')
  return false
}

export function registerLayoutDirectiveKeyboardBindings(editor: Quill): void {
  editor.keyboard.addBinding({ key: 'ArrowRight' }, (range: SelectionRange) => moveAcrossPagebreakRight(editor, range))
  editor.keyboard.addBinding({ key: 'ArrowLeft' }, (range: SelectionRange) => moveAcrossPagebreakLeft(editor, range))
}