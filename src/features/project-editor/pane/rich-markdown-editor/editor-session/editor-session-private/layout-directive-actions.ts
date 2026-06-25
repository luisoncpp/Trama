// @Architecture(descriptionShort="Toolbar-triggered layout helpers for pagebreak/spacer insertion and center toggle")
import type Quill from 'quill'
import Delta from 'quill-delta'
import {
  LAYOUT_DIRECTIVE_BLOT_NAME,
  type LayoutDirectiveEmbedValue,
  type CenterSegment,
  type LineRange,
} from './layout-directive-types.js'
import {
  findCenterSegmentAtIndex,
  getCenterSegments,
  getLineEndIndexExclusive,
  getLineStartIndex,
  normalizeSelectionToLineRange,
} from './layout-directive-center-ranges.js'

function getDeltaLength(delta: Delta): number {
  return delta.ops.reduce((length, op) => {
    if (typeof op.insert === 'string') return length + op.insert.length
    return typeof op.insert === 'undefined' ? length : length + 1
  }, 0)
}

function createCenterDirective(role: 'start' | 'end'): Record<typeof LAYOUT_DIRECTIVE_BLOT_NAME, LayoutDirectiveEmbedValue> {
  return {
    [LAYOUT_DIRECTIVE_BLOT_NAME]: { directive: 'center', role },
  } as Record<typeof LAYOUT_DIRECTIVE_BLOT_NAME, LayoutDirectiveEmbedValue>
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

function buildToggledCenterContents(
  editor: Quill,
  segment: CenterSegment,
  lineRange: LineRange,
): { delta: Delta; cursorIndex: number } {
  const contents = editor.getContents() as Delta
  const prefix = contents.slice(0, segment.startBoundaryIndex)
  const left = contents.slice(segment.contentStartIndex, lineRange.startIndex)
  const selected = contents.slice(lineRange.startIndex, lineRange.endIndexExclusive)
  const right = contents.slice(lineRange.endIndexExclusive, segment.contentEndIndexExclusive)
  const suffix = contents.slice(segment.endBoundaryIndex + 1)

  const leftLength = getDeltaLength(left)

  let next = new Delta().concat(prefix)
  if (leftLength > 0) {
    next = next.concat(createCenterBoundaryDelta('start')).concat(left).concat(createCenterBoundaryDelta('end'))
  }

  next = next.concat(selected)

  if (getDeltaLength(right) > 0) {
    next = next.concat(createCenterBoundaryDelta('start')).concat(right).concat(createCenterBoundaryDelta('end'))
  }

  const cursorIndex = leftLength > 0
    ? Math.max(0, segment.startBoundaryIndex + leftLength)
    : Math.max(0, segment.startBoundaryIndex)

  return { delta: next.concat(suffix), cursorIndex }
}

function buildExtendedCenterContents(
  editor: Quill,
  lineRange: LineRange,
): { delta: Delta; cursorIndex: number } | null {
  const contents = editor.getContents() as Delta
  const segments = getCenterSegments(editor)
  const previousSegment = segments.find((candidate) => candidate.endBoundaryIndex === lineRange.startIndex - 1) ?? null
  if (previousSegment && previousSegment.endBoundaryIndex === lineRange.startIndex - 1) {
    const prefix = contents.slice(0, previousSegment.endBoundaryIndex)
    const selected = contents.slice(lineRange.startIndex, lineRange.endIndexExclusive)
    const endBoundary = contents.slice(previousSegment.endBoundaryIndex, previousSegment.endBoundaryIndex + 1)
    const suffix = contents.slice(lineRange.endIndexExclusive)

    const delta = new Delta()
      .concat(prefix)
      .concat(selected)
      .concat(endBoundary)
      .concat(suffix)

    const cursorIndex = Math.max(0, previousSegment.endBoundaryIndex + getDeltaLength(selected) - 1)

    return { delta, cursorIndex }
  }

  const nextSegment = segments.find((candidate) => candidate.startBoundaryIndex === lineRange.endIndexExclusive) ?? null
  if (nextSegment && nextSegment.startBoundaryIndex === lineRange.endIndexExclusive) {
    const prefix = contents.slice(0, lineRange.startIndex)
    const startBoundary = contents.slice(nextSegment.startBoundaryIndex, nextSegment.startBoundaryIndex + 1)
    const selected = contents.slice(lineRange.startIndex, lineRange.endIndexExclusive)
    const centered = contents.slice(nextSegment.contentStartIndex, nextSegment.endBoundaryIndex + 1)
    const suffix = contents.slice(nextSegment.endBoundaryIndex + 1)

    const delta = new Delta()
      .concat(prefix)
      .concat(startBoundary)
      .concat(selected)
      .concat(centered)
      .concat(suffix)

    const cursorIndex = Math.max(0, lineRange.startIndex + 1 + getDeltaLength(selected) - 1)

    return { delta, cursorIndex }
  }

  return null
}

export function insertPagebreakDirective(editor: Quill): void {
  const selection = editor.getSelection()
  const currentIndex = selection?.index ?? editor.getLength() - 1
  editor.insertEmbed(currentIndex, LAYOUT_DIRECTIVE_BLOT_NAME, { directive: 'pagebreak' }, 'user')
  editor.setSelection(currentIndex + 1, 0, 'silent')
}

export function insertSpacerDirective(editor: Quill, lines = 1): void {
  const safeLines = Number.isInteger(lines) ? Math.min(12, Math.max(1, lines)) : 1
  const selection = editor.getSelection()
  const currentIndex = selection?.index ?? editor.getLength() - 1
  const lineStart = getLineStartIndex(editor, currentIndex)
  editor.insertEmbed(lineStart, LAYOUT_DIRECTIVE_BLOT_NAME, { directive: 'spacer', lines: safeLines }, 'user')
  editor.setSelection(lineStart + 1, 0, 'silent')
}

export function insertCenterDirectives(editor: Quill): void {
  const selection = editor.getSelection()
  const index = selection?.index ?? Math.max(0, editor.getLength() - 1)
  const length = selection?.length ?? 0
  const startLineIndex = getLineStartIndex(editor, index)
  const selectionEndProbe = length > 0 ? index + length - 1 : index
  const endLineIndex = getLineEndIndexExclusive(editor, selectionEndProbe)

  editor.insertEmbed(startLineIndex, LAYOUT_DIRECTIVE_BLOT_NAME, { directive: 'center', role: 'start' }, 'user')
  editor.insertEmbed(endLineIndex + 1, LAYOUT_DIRECTIVE_BLOT_NAME, { directive: 'center', role: 'end' }, 'user')
  editor.setSelection(endLineIndex + 2, 0, 'silent')
}

export function toggleCenterDirectives(editor: Quill): void {
  const selection = {
    index: editor.getSelection()?.index ?? Math.max(0, editor.getLength() - 1),
    length: editor.getSelection()?.length ?? 0,
  }
  const lineRange = normalizeSelectionToLineRange(editor, selection)
  const segment = findToggleTargetSegment(editor, lineRange)

  if (!segment) {
    const result = buildExtendedCenterContents(editor, lineRange)
    if (result) {
      editor.setContents(result.delta, 'user')
      editor.setSelection(result.cursorIndex, 0, 'silent')
      return
    }

    insertCenterDirectives(editor)
    return
  }

  const toggleResult = buildToggledCenterContents(editor, segment, lineRange)
  editor.setContents(toggleResult.delta, 'user')
  editor.setSelection(toggleResult.cursorIndex, 0, 'silent')
}
