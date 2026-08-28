// @Architecture(descriptionShort="Quill-owned select-all: setSelection spanning the document without native SelectAll")
import type Quill from 'quill'

export function selectAllInEditor(editor: Quill): void {
  const length = Math.max(0, editor.getLength() - 1)
  editor.setSelection(0, length, 'user')
}

type SelectAllKeyboardBinding = {
  key: string
  shortKey: true
  handler: (this: { quill: Quill }) => boolean
}

/** Quill Ctrl/Cmd+A binding; returns false to preventDefault when handled. */
export function createSelectAllKeyboardBinding(): Record<string, SelectAllKeyboardBinding> {
  return {
    selectAll: {
      key: 'a',
      shortKey: true,
      handler(this: { quill: Quill }) {
        selectAllInEditor(this.quill)
        return false
      },
    },
  }
}
