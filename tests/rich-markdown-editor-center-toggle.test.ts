import { describe, expect, it } from 'vitest'
import type Quill from 'quill'
import Delta from 'quill-delta'
import {
  deriveCenterSegments,
  extractCenterBoundariesFromOps,
  findCenterSegmentAtIndex,
  getCenterSegments,
  normalizeSelectionToLineRange,
} from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges'
import {
  insertCenterDirectives,
  toggleCenterDirectives,
} from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-actions'

interface StubLine {
  length: () => number
}

interface StubEditorOptions {
  ops: Array<{ insert?: string | Record<string, unknown> }>
  text?: string
  selection?: { index: number; length: number }
}

interface MutableEditorStub {
  getContents: () => Delta
  getLine: (index: number) => [StubLine | null, number]
  getLength: () => number
  getSelection: () => { index: number; length: number }
  updateContents: (delta: Delta, source?: string) => void
  setContents: (delta: Delta, source?: string) => void
  insertEmbed: (index: number, type: string, value: Record<string, unknown>, source?: string) => void
  deleteText: (index: number, length: number, source?: string) => void
  setSelection: (index: number, length: number, source?: string) => void
}

function getInsertLength(insert: string | Record<string, unknown> | undefined): number {
  if (typeof insert === 'string') return insert.length
  return insert ? 1 : 0
}

function serializeOps(ops: Array<{ insert?: string | Record<string, unknown> }>): string[] {
  return ops.map((op) => {
    if (typeof op.insert === 'string') return op.insert
    const embed = op.insert as Record<string, unknown>
    const directive = embed['trama-directive'] as { directive?: string; role?: string } | undefined
    if (directive?.directive === 'center') return directive.role === 'end' ? '[center:end]' : '[center:start]'
    return '[embed]'
  })
}

function quillIndexToTextIndex(
  ops: Array<{ insert?: string | Record<string, unknown> }>,
  index: number,
): number {
  let docIndex = 0
  let textIndex = 0

  for (const op of ops) {
    const insert = op.insert
    if (typeof insert === 'string') {
      const nextDocIndex = docIndex + insert.length
      if (index <= nextDocIndex) {
        return textIndex + Math.max(0, index - docIndex)
      }
      docIndex = nextDocIndex
      textIndex += insert.length
      continue
    }

    if (insert) {
      if (index <= docIndex + 1) {
        return textIndex
      }
      docIndex += 1
    }
  }

  return textIndex
}

function buildTextFromOps(ops: Array<{ insert?: string | Record<string, unknown> }>): string {
  return ops
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
}

function textIndexToQuillIndex(
  ops: Array<{ insert?: string | Record<string, unknown> }>,
  textIndex: number,
): number {
  let docIndex = 0
  let currentTextIndex = 0

  for (const op of ops) {
    const insert = op.insert
    if (typeof insert === 'string') {
      const nextTextIndex = currentTextIndex + insert.length
      if (textIndex <= nextTextIndex) {
        return docIndex + Math.max(0, textIndex - currentTextIndex)
      }
      currentTextIndex = nextTextIndex
      docIndex += insert.length
      continue
    }

    if (insert) {
      docIndex += 1
    }
  }

  return docIndex
}

function createLineAwareEditorStub({ ops, text = '' }: StubEditorOptions): Quill {
  const getLine = (index: number): [StubLine | null, number] => {
    const safeText = text.length > 0 ? text : '\n'
    const clamped = Math.max(0, Math.min(index, Math.max(0, safeText.length - 1)))

    let cursor = 0
    while (cursor < safeText.length) {
      const nextBreak = safeText.indexOf('\n', cursor)
      const lineEnd = nextBreak >= 0 ? nextBreak + 1 : safeText.length
      const lineLength = Math.max(1, lineEnd - cursor)
      if (clamped < lineEnd || lineEnd === safeText.length) {
        return [{ length: () => lineLength }, clamped - cursor]
      }
      cursor = lineEnd
    }

    return [null, 0]
  }

  const editor = {
    getContents: () => ({ ops }),
    getLine,
    getLength: () => (text.length > 0 ? text.length : 1),
  }

  return editor as unknown as Quill
}

function createMutableEditorStub({ ops, text, selection }: StubEditorOptions): Quill & MutableEditorStub {
  const state = {
    ops: [...ops],
    selection: selection ?? { index: 0, length: 0 },
  }

  const editor = {
    getContents: () => new Delta(state.ops),
    getLine: (index: number) => {
      const currentText = text ?? buildTextFromOps(state.ops)
      const mappedIndex = quillIndexToTextIndex(state.ops, index)
      const safeText = currentText.length > 0 ? currentText : '\n'
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
    getLength: () => {
      const length = state.ops.reduce((sum, op) => sum + getInsertLength(op.insert), 0)
      return Math.max(1, length)
    },
    getSelection: () => state.selection,
    updateContents: (delta: Delta) => {
      state.ops = new Delta(state.ops).compose(delta).ops as Array<{ insert?: string | Record<string, unknown> }>
    },
    setContents: (delta: Delta) => {
      state.ops = delta.ops as Array<{ insert?: string | Record<string, unknown> }>
    },
    insertEmbed: (index: number, type: string, value: Record<string, unknown>) => {
      state.ops = new Delta(state.ops)
        .compose(new Delta().retain(index).insert({ [type]: value }))
        .ops as Array<{ insert?: string | Record<string, unknown> }>
    },
    deleteText: (index: number, length: number) => {
      state.ops = new Delta(state.ops)
        .compose(new Delta().retain(index).delete(length))
        .ops as Array<{ insert?: string | Record<string, unknown> }>
    },
    setSelection: (index: number, length: number) => {
      state.selection = { index, length }
    },
  }

  return editor as unknown as Quill & MutableEditorStub
}

describe('rich-markdown-editor-layout-center-ranges', () => {
  it('parses one simple center segment from ops', () => {
    const ops = [
      { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
      { insert: 'Hello\n' },
      { insert: { 'trama-directive': { directive: 'center', role: 'end' } } },
      { insert: '\n' },
    ]

    const boundaries = extractCenterBoundariesFromOps(ops)
    expect(boundaries).toEqual([
      { index: 0, role: 'start' },
      { index: 7, role: 'end' },
    ])

    const segments = deriveCenterSegments(boundaries)
    expect(segments).toEqual([
      {
        startBoundaryIndex: 0,
        endBoundaryIndex: 7,
        contentStartIndex: 1,
        contentEndIndexExclusive: 7,
      },
    ])
  })

  it('parses multiple center segments from ops', () => {
    const ops = [
      { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
      { insert: 'A\n' },
      { insert: { 'trama-directive': { directive: 'center', role: 'end' } } },
      { insert: 'B\n' },
      { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
      { insert: 'C\n' },
      { insert: { 'trama-directive': { directive: 'center', role: 'end' } } },
      { insert: '\n' },
    ]

    const editor = createLineAwareEditorStub({ ops })
    const segments = getCenterSegments(editor)
    expect(segments).toEqual([
      {
        startBoundaryIndex: 0,
        endBoundaryIndex: 3,
        contentStartIndex: 1,
        contentEndIndexExclusive: 3,
      },
      {
        startBoundaryIndex: 6,
        endBoundaryIndex: 9,
        contentStartIndex: 7,
        contentEndIndexExclusive: 9,
      },
    ])

    expect(findCenterSegmentAtIndex(editor, 2)).toEqual(segments[0])
    expect(findCenterSegmentAtIndex(editor, 8)).toEqual(segments[1])
    expect(findCenterSegmentAtIndex(editor, 4)).toBeNull()
  })

  it('ignores malformed unclosed center:start when deriving segments', () => {
    const ops = [
      { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
      { insert: 'Dangling center block\n' },
    ]

    const boundaries = extractCenterBoundariesFromOps(ops)
    expect(boundaries).toEqual([{ index: 0, role: 'start' }])
    expect(deriveCenterSegments(boundaries)).toEqual([])
  })

  it('normalizes selection to full line range', () => {
    const editor = createLineAwareEditorStub({
      ops: [{ insert: 'A\nB\nC\n' }],
      text: 'A\nB\nC\n',
    })

    expect(normalizeSelectionToLineRange(editor, { index: 2, length: 0 })).toEqual({
      startIndex: 2,
      endIndexExclusive: 4,
    })

    expect(normalizeSelectionToLineRange(editor, { index: 0, length: 4 })).toEqual({
      startIndex: 0,
      endIndexExclusive: 4,
    })
  })

  it('toggles a centered middle line into two canonical segments', () => {
    const editor = createMutableEditorStub({
      ops: [
        { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
        { insert: 'A\nB\nC\n' },
        { insert: { 'trama-directive': { directive: 'center', role: 'end' } } },
        { insert: '\n' },
      ],
      text: 'A\nB\nC\n\n',
      selection: { index: 3, length: 0 },
    })

    toggleCenterDirectives(editor)

    expect(serializeOps(editor.getContents().ops)).toEqual([
      '[center:start]',
      'A\n',
      '[center:end]',
      'B\n',
      '[center:start]',
      'C\n',
      '[center:end]',
      '\n',
    ])
  })

  it('toggles the last centered line into a left-only segment', () => {
    const editor = createMutableEditorStub({
      ops: [
        { insert: { 'trama-directive': { directive: 'center', role: 'start' } } },
        { insert: 'A\nB\n' },
        { insert: { 'trama-directive': { directive: 'center', role: 'end' } } },
        { insert: '\n' },
      ],
      text: 'A\nB\n\n',
      selection: { index: 3, length: 0 },
    })

    toggleCenterDirectives(editor)

    expect(serializeOps(editor.getContents().ops)).toEqual([
      '[center:start]',
      'A\n',
      '[center:end]',
      'B\n\n',
    ])
  })

  it('toggles an outside line by creating a centered segment', () => {
    const editor = createMutableEditorStub({
      ops: [{ insert: 'A\nB\n' }],
      text: 'A\nB\n',
      selection: { index: 2, length: 0 },
    })

    toggleCenterDirectives(editor)

    expect(serializeOps(editor.getContents().ops)).toEqual([
      'A\n',
      '[center:start]',
      'B\n',
      '[center:end]',
    ])
  })

  it('keeps repeated center insertion idempotent through toggle behavior', () => {
    const editor = createMutableEditorStub({
      ops: [{ insert: 'A\n' }],
      text: 'A\n',
      selection: { index: 0, length: 0 },
    })

    insertCenterDirectives(editor)
    editor.setSelection(1, 0)
    toggleCenterDirectives(editor)
    editor.setSelection(1, 0)
    toggleCenterDirectives(editor)

    const serialized = serializeOps(editor.getContents().ops)
    expect(serialized).toEqual([
      '[center:start]',
      'A\n',
      '[center:end]',
    ])
    expect(serialized.filter((token) => token === '[center:start]')).toHaveLength(1)
    expect(serialized.filter((token) => token === '[center:end]')).toHaveLength(1)
  })
})
