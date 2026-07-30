// @Architecture(descriptionShort="Safe active-editor mutation for Contents page-break and spacer labels")
import type Quill from 'quill'
import Delta from 'quill-delta'
import { normalizeDirectiveLabel } from '../../../../../../shared/markdown-layout-directive-label.js'
import { scanQuillHeadings } from '../../../../document-contents/index.js'
import type { DocumentContentsLabelTarget } from '../../../../project-editor-types.js'
import { LAYOUT_DIRECTIVE_BLOT_NAME, type LayoutDirectiveEmbedValue } from './layout-directive-types.js'

function buildEmbedValue(target: DocumentContentsLabelTarget, lines: number | undefined): LayoutDirectiveEmbedValue {
  const label = normalizeDirectiveLabel(target.label)
  if (target.type === 'pagebreak') {
    return label ? { directive: 'pagebreak', label } : { directive: 'pagebreak' }
  }

  const safeLines = Number.isInteger(lines) ? Math.min(12, Math.max(1, lines ?? 1)) : 1
  return label ? { directive: 'spacer', lines: safeLines, label } : { directive: 'spacer', lines: safeLines }
}

function restoreSelection(editor: Quill, startIndex: number, sourceLength: number, prior: { index: number; length: number } | null): void {
  if (!prior) return

  const endIndex = startIndex + sourceLength
  const shift = 1 - sourceLength
  const nextIndex = prior.index <= startIndex
    ? prior.index
    : prior.index >= endIndex
      ? prior.index + shift
      : startIndex + 1
  const maxIndex = Math.max(0, editor.getLength() - 1)
  editor.setSelection(Math.max(0, Math.min(nextIndex, maxIndex)), prior.length, 'silent')
}

export function setLayoutDirectiveLabel(editor: Quill, target: DocumentContentsLabelTarget): boolean {
  if (!editor.isEnabled()) return false

  const item = scanQuillHeadings(editor).find((candidate) => candidate.ordinal === target.ordinal)
  if (!item || item.type !== target.type) return false

  const sourceLength = item.sourceLength ?? 1
  const value = buildEmbedValue(target, item.lines)
  const change = new Delta()
    .retain(item.index)
    .delete(sourceLength)
    .insert({ [LAYOUT_DIRECTIVE_BLOT_NAME]: value })
  const selection = editor.getSelection()
  editor.updateContents(change, 'user')
  restoreSelection(editor, item.index, sourceLength, selection)
  return true
}
