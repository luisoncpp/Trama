import type Quill from 'quill'
import Delta from 'quill-delta'
import { LAYOUT_DIRECTIVE_BLOT_NAME } from './rich-markdown-editor-layout-blots'
import { buildBoundarySafeDeleteContents, type CenterDeleteDirection } from './rich-markdown-editor-layout-center-delete'

interface SelectionRange {
  index: number
  length: number
}

type KeyboardHandler = (this: { quill: Quill }, range: SelectionRange) => boolean

interface KeyboardBindingConfig {
  key: string
  collapsed?: boolean
  handler: KeyboardHandler
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

export function handleCenterBoundaryDelete(
  editor: Quill,
  range: SelectionRange,
  direction: CenterDeleteDirection,
): boolean {
  const nextContents = buildBoundarySafeDeleteContents(editor, range, direction)
  if (!nextContents) {
    return true
  }

  const currentContents = editor.getContents() as Delta
  editor.updateContents(currentContents.diff(nextContents), 'user')
  const nextSelectionIndex = direction === 'backspace' ? Math.max(0, range.index - 1) : range.index
  editor.setSelection(nextSelectionIndex, 0, 'silent')
  return false
}

export function createLayoutDirectiveKeyboardBindings(): Record<string, KeyboardBindingConfig> {
  return {
    centerBoundaryBackspace: {
      key: 'Backspace',
      collapsed: true,
      handler(this: { quill: Quill }, range: SelectionRange) {
        return handleCenterBoundaryDelete(this.quill, range, 'backspace')
      },
    },
    centerBoundaryDelete: {
      key: 'Delete',
      collapsed: true,
      handler(this: { quill: Quill }, range: SelectionRange) {
        return handleCenterBoundaryDelete(this.quill, range, 'delete')
      },
    },
    pagebreakArrowRight: {
      key: 'ArrowRight',
      handler(this: { quill: Quill }, range: SelectionRange) {
        return moveAcrossPagebreakRight(this.quill, range)
      },
    },
    pagebreakArrowLeft: {
      key: 'ArrowLeft',
      handler(this: { quill: Quill }, range: SelectionRange) {
        return moveAcrossPagebreakLeft(this.quill, range)
      },
    },
  }
}
