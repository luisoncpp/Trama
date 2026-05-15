import { describe, expect, it } from 'vitest'
import type Quill from 'quill'
import Delta from 'quill-delta'
import { handleCenterBoundaryDelete } from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-keyboard'

interface StubLine {
  length: () => number
}

interface MutableEditorStub {
  getContents: () => Delta
  getLine: (index: number) => [StubLine | null, number]
  getLength: () => number
  updateContents: (delta: Delta, source?: string) => void
  setSelection: (index: number, length: number, source?: string) => void
  selection: { index: number; length: number }
}

function getInsertLength(insert: string | Record<string, unknown> | undefined): number {
  if (typeof insert === 'string') {
    return insert.length
  }

  return insert ? 1 : 0
}

function buildTextFromOps(ops: Array<{ insert?: string | Record<string, unknown> }>): string {
  return ops
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
}

function quillIndexToTextIndex(
  ops: Array<{ insert?: string | Record<string, unknown> }>,
  index: number,
): number {
  let docIndex = 0
  let textIndex = 0

  for (const op of ops) {
    if (typeof op.insert === 'string') {
      const nextDocIndex = docIndex + op.insert.length
      if (index <= nextDocIndex) {
        return textIndex + Math.max(0, index - docIndex)
      }
      docIndex = nextDocIndex
      textIndex += op.insert.length
      continue
    }

    if (op.insert) {
      if (index <= docIndex + 1) {
        return textIndex
      }
      docIndex += 1
    }
  }

  return textIndex
}

function textIndexToQuillIndex(
  ops: Array<{ insert?: string | Record<string, unknown> }>,
  textIndex: number,
): number {
  let docIndex = 0
  let currentTextIndex = 0

  for (const op of ops) {
    if (typeof op.insert === 'string') {
      const nextTextIndex = currentTextIndex + op.insert.length
      if (textIndex < nextTextIndex) {
        return docIndex + Math.max(0, textIndex - currentTextIndex)
      }
      currentTextIndex = nextTextIndex
      docIndex += op.insert.length
      continue
    }

    if (op.insert) {
      docIndex += 1
    }
  }

  return docIndex
}

function serializeOps(ops: Array<{ insert?: string | Record<string, unknown> }>): string[] {
  return ops.map((op) => {
    if (typeof op.insert === 'string') {
      return op.insert
    }

    const embed = op.insert as Record<string, unknown>
    const directive = embed['trama-directive'] as { directive?: string; role?: string } | undefined
    if (directive?.directive === 'center') {
      return directive.role === 'end' ? '[center:end]' : '[center:start]'
    }

    return '[embed]'
  })
}

function createMutableEditorStub(
  ops: Array<{ insert?: string | Record<string, unknown> }>,
): Quill & MutableEditorStub {
  const state = {
    ops: [...ops],
    selection: { index: 0, length: 0 },
  }

  const editor = {
    getContents: () => new Delta(state.ops),
    getLine: (index: number) => {
      const text = buildTextFromOps(state.ops)
      const mappedIndex = quillIndexToTextIndex(state.ops, index)
      const safeText = text.length > 0 ? text : '\n'
      const clamped = Math.max(0, Math.min(mappedIndex, Math.max(0, safeText.length - 1)))
      const lineStart = safeText.lastIndexOf('\n', Math.max(0, clamped - 1)) + 1
      const nextBreak = safeText.indexOf('\n', clamped)
      const lineEnd = nextBreak >= 0 ? nextBreak + 1 : safeText.length
      const lineStartDocIndex = textIndexToQuillIndex(state.ops, lineStart)

      return [
        { length: () => Math.max(1, lineEnd - lineStart) },
        Math.max(0, index - lineStartDocIndex),
      ]
    },
    getLength: () => Math.max(1, state.ops.reduce((sum, op) => sum + getInsertLength(op.insert), 0)),
    updateContents: (delta: Delta) => {
      state.ops = new Delta(state.ops).compose(delta).ops as Array<{ insert?: string | Record<string, unknown> }>
    },
    setSelection: (index: number, length: number) => {
      state.selection = { index, length }
    },
    get selection() {
      return state.selection
    },
  }

  return editor as unknown as Quill & MutableEditorStub
}

describe('center boundary-safe deletion', () => {
  it('moves center:end after the first non-centered line on Backspace seam delete', () => {
    const editor = createMutableEditorStub([
      { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
      { insert: 'A\n' },
      { insert: { 'trama-directive': { directive: 'center', role: 'end' } } },
      { insert: 'B\nC\n' },
    ])

    const handled = handleCenterBoundaryDelete(editor, { index: 4, length: 0 }, 'backspace')

    expect(handled).toBe(false)
    expect(serializeOps(editor.getContents().ops)).toEqual([
      '[center:start]',
      'A\nB\n',
      '[center:end]',
      'C\n',
    ])
    expect(editor.selection).toEqual({ index: 3, length: 0 })
  })

  it('moves center:end after the first non-centered line on Delete seam delete without leaking centering', () => {
    const editor = createMutableEditorStub([
      { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
      { insert: 'A\n' },
      { insert: { 'trama-directive': { directive: 'center', role: 'end' } } },
      { insert: 'B\nC\nD\n' },
    ])

    const handled = handleCenterBoundaryDelete(editor, { index: 3, length: 0 }, 'delete')

    expect(handled).toBe(false)
    expect(serializeOps(editor.getContents().ops)).toEqual([
      '[center:start]',
      'A\nB\n',
      '[center:end]',
      'C\nD\n',
    ])
    expect(editor.selection).toEqual({ index: 3, length: 0 })
  })

  it('leaves unrelated deletes to the default Quill behavior', () => {
    const editor = createMutableEditorStub([
      { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
      { insert: 'A\nB\n' },
      { insert: { 'trama-directive': { directive: 'center', role: 'end' } } },
      { insert: 'C\n' },
    ])

    const handled = handleCenterBoundaryDelete(editor, { index: 2, length: 0 }, 'backspace')

    expect(handled).toBe(true)
    expect(serializeOps(editor.getContents().ops)).toEqual([
      '[center:start]',
      'A\nB\n',
      '[center:end]',
      'C\n',
    ])
  })
})
