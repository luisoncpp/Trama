import { describe, expect, it } from 'vitest'
import type Quill from 'quill'
import {
  deriveCenterSegments,
  extractCenterBoundariesFromOps,
  findCenterSegmentAtIndex,
  getCenterSegments,
  normalizeSelectionToLineRange,
} from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-center-ranges'

interface StubLine {
  length: () => number
}

interface StubEditorOptions {
  ops: Array<{ insert?: string | Record<string, unknown> }>
  text?: string
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
})
