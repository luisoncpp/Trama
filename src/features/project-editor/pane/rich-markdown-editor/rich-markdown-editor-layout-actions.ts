import type Quill from 'quill'
import { LAYOUT_DIRECTIVE_BLOT_NAME, type LayoutDirectiveEmbedValue } from './rich-markdown-editor-layout-blots'

function getLineStartIndex(editor: Quill, index: number): number {
  const [line, offset] = editor.getLine(index)
  if (!line) {
    return Math.max(0, index)
  }

  return index - offset
}

function getLineEndIndex(editor: Quill, index: number): number {
  const [line] = editor.getLine(index)
  if (!line) {
    return Math.max(0, index)
  }

  const lineStart = getLineStartIndex(editor, index)
  return lineStart + line.length()
}

function insertDirectiveAt(editor: Quill, index: number, directive: LayoutDirectiveEmbedValue): void {
  editor.insertEmbed(index, LAYOUT_DIRECTIVE_BLOT_NAME, directive, 'user')
}

export function insertPagebreakDirective(editor: Quill): void {
  const selection = editor.getSelection()
  const currentIndex = selection?.index ?? editor.getLength() - 1
  insertDirectiveAt(editor, currentIndex, { directive: 'pagebreak' })
  editor.setSelection(currentIndex + 1, 0, 'silent')
}

export function insertSpacerDirective(editor: Quill, lines = 1): void {
  const safeLines = Number.isInteger(lines) ? Math.min(12, Math.max(1, lines)) : 1
  const selection = editor.getSelection()
  const currentIndex = selection?.index ?? editor.getLength() - 1
  const lineStart = getLineStartIndex(editor, currentIndex)
  insertDirectiveAt(editor, lineStart, { directive: 'spacer', lines: safeLines })
  editor.setSelection(lineStart + 1, 0, 'silent')
}

export function insertCenterDirectives(editor: Quill): void {
  const selection = editor.getSelection()
  const selectionIndex = selection?.index ?? Math.max(0, editor.getLength() - 1)
  const selectionLength = selection?.length ?? 0
  const startLineIndex = getLineStartIndex(editor, selectionIndex)

  const selectionEndProbe = selectionLength > 0 ? selectionIndex + selectionLength - 1 : selectionIndex
  const endLineIndex = getLineEndIndex(editor, selectionEndProbe)

  insertDirectiveAt(editor, startLineIndex, { directive: 'center', role: 'start' })
  insertDirectiveAt(editor, endLineIndex + 1, { directive: 'center', role: 'end' })
  editor.setSelection(endLineIndex + 2, 0, 'silent')
}