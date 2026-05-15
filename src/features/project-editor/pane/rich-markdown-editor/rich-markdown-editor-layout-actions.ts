import type Quill from 'quill'
import Delta from 'quill-delta'
import { LAYOUT_DIRECTIVE_BLOT_NAME, type LayoutDirectiveEmbedValue } from './rich-markdown-editor-layout-blots'
import {
  getCenterSegments,
  findCenterSegmentAtIndex,
  normalizeSelectionToLineRange,
  type CenterSegment,
  type LineRange,
} from './rich-markdown-editor-layout-center-ranges'

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

function getSelectionRange(editor: Quill): { index: number; length: number } {
  const selection = editor.getSelection()
  return {
    index: selection?.index ?? Math.max(0, editor.getLength() - 1),
    length: selection?.length ?? 0,
  }
}

function createCenterDirective(role: 'start' | 'end'): { [LAYOUT_DIRECTIVE_BLOT_NAME]: LayoutDirectiveEmbedValue } {
  return {
    [LAYOUT_DIRECTIVE_BLOT_NAME]: { directive: 'center', role },
  }
}

function getDeltaLength(delta: Delta): number {
  return delta.ops.reduce((length, op) => {
    if (typeof op.insert === 'string') return length + op.insert.length
    return typeof op.insert === 'undefined' ? length : length + 1
  }, 0)
}

function createCenterBoundaryDelta(role: 'start' | 'end'): Delta {
  return new Delta().insert(createCenterDirective(role))
}

function findToggleTargetSegment(editor: Quill, lineRange: LineRange): CenterSegment | null {
  const startSegment = findCenterSegmentAtIndex(editor, lineRange.startIndex)
  const endSegment = findCenterSegmentAtIndex(editor, Math.max(lineRange.startIndex, lineRange.endIndexExclusive - 1))
  if (!startSegment || !endSegment) {
    return null
  }

  if (
    startSegment.startBoundaryIndex !== endSegment.startBoundaryIndex
    || startSegment.endBoundaryIndex !== endSegment.endBoundaryIndex
  ) {
    return null
  }

  return startSegment
}

function buildToggledCenterContents(editor: Quill, segment: CenterSegment, lineRange: LineRange): Delta {
  const contents = editor.getContents() as Delta
  const prefix = contents.slice(0, segment.startBoundaryIndex)
  const left = contents.slice(segment.contentStartIndex, lineRange.startIndex)
  const selected = contents.slice(lineRange.startIndex, lineRange.endIndexExclusive)
  const right = contents.slice(lineRange.endIndexExclusive, segment.contentEndIndexExclusive)
  const suffix = contents.slice(segment.endBoundaryIndex + 1)

  let next = new Delta().concat(prefix)
  if (getDeltaLength(left) > 0) {
    next = next.concat(createCenterBoundaryDelta('start')).concat(left).concat(createCenterBoundaryDelta('end'))
  }

  next = next.concat(selected)

  if (getDeltaLength(right) > 0) {
    next = next.concat(createCenterBoundaryDelta('start')).concat(right).concat(createCenterBoundaryDelta('end'))
  }

  return next.concat(suffix)
}

function buildExtendedCenterContents(editor: Quill, lineRange: LineRange): Delta | null {
  const contents = editor.getContents() as Delta
  const segments = getCenterSegments(editor)
  const previousSegment = segments.find((candidate) => candidate.endBoundaryIndex === lineRange.startIndex - 1) ?? null
  if (previousSegment && previousSegment.endBoundaryIndex === lineRange.startIndex - 1) {
    const prefix = contents.slice(0, previousSegment.endBoundaryIndex)
    const selected = contents.slice(lineRange.startIndex, lineRange.endIndexExclusive)
    const endBoundary = contents.slice(previousSegment.endBoundaryIndex, previousSegment.endBoundaryIndex + 1)
    const suffix = contents.slice(lineRange.endIndexExclusive)

    return new Delta()
      .concat(prefix)
      .concat(selected)
      .concat(endBoundary)
      .concat(suffix)
  }

  const nextSegment = segments.find((candidate) => candidate.startBoundaryIndex === lineRange.endIndexExclusive) ?? null
  if (nextSegment && nextSegment.startBoundaryIndex === lineRange.endIndexExclusive) {
    const prefix = contents.slice(0, lineRange.startIndex)
    const startBoundary = contents.slice(nextSegment.startBoundaryIndex, nextSegment.startBoundaryIndex + 1)
    const selected = contents.slice(lineRange.startIndex, lineRange.endIndexExclusive)
    const centered = contents.slice(nextSegment.contentStartIndex, nextSegment.endBoundaryIndex + 1)
    const suffix = contents.slice(nextSegment.endBoundaryIndex + 1)

    return new Delta()
      .concat(prefix)
      .concat(startBoundary)
      .concat(selected)
      .concat(centered)
      .concat(suffix)
  }

  return null
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
  const selection = getSelectionRange(editor)
  const startLineIndex = getLineStartIndex(editor, selection.index)
  const selectionEndProbe = selection.length > 0 ? selection.index + selection.length - 1 : selection.index
  const endLineIndex = getLineEndIndex(editor, selectionEndProbe)

  insertDirectiveAt(editor, startLineIndex, { directive: 'center', role: 'start' })
  insertDirectiveAt(editor, endLineIndex + 1, { directive: 'center', role: 'end' })
  editor.setSelection(endLineIndex + 2, 0, 'silent')
}

export function toggleCenterDirectives(editor: Quill): void {
  const lineRange = normalizeSelectionToLineRange(editor, getSelectionRange(editor))
  const segment = findToggleTargetSegment(editor, lineRange)

  if (!segment) {
    const extendedContents = buildExtendedCenterContents(editor, lineRange)
    if (extendedContents) {
      editor.setContents(extendedContents, 'user')
      editor.setSelection(Math.max(0, lineRange.endIndexExclusive - 1), 0, 'silent')
      return
    }

    insertCenterDirectives(editor)
    return
  }

  editor.setContents(buildToggledCenterContents(editor, segment, lineRange), 'user')
  editor.setSelection(Math.max(segment.startBoundaryIndex, lineRange.startIndex - 1), 0, 'silent')
}
