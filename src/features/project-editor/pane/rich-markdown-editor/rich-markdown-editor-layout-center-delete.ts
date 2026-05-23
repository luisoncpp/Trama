import type Quill from 'quill'
import Delta from 'quill-delta'
import {
  type CenterDeleteDirection,
  type CenterSegment,
  type SelectionRange,
  getCenterSegments,
  getLineStartIndex,
  getLineEndIndexExclusive,
  buildSegmentWithShiftedEndBoundary,
  buildSegmentWithShiftedStartBoundary,
  startsWithTextInsert,
} from './rich-markdown-editor-layout-center-ranges'

export type { CenterDeleteDirection, CenterSegment, SelectionRange }

export function buildBoundarySafeDeleteContents(
  editor: Quill,
  selection: SelectionRange | null,
  direction: CenterDeleteDirection,
): Delta | null {
  if (!selection || selection.length !== 0) return null

  const segments = getCenterSegments(editor)
  const contents = editor.getContents() as Delta

  if (direction === 'backspace') {
    return handleBackspaceDelete(editor, selection, segments, contents)
  }

  return handleDeleteForward(editor, selection, segments, contents)
}

function handleBackspaceDelete(
  editor: Quill,
  selection: SelectionRange,
  segments: CenterSegment[],
  contents: Delta,
): Delta | null {
  if (selection.index <= 0) return null

  const startSegment = segments.find((c) => selection.index === c.startBoundaryIndex + 1)
  if (startSegment && getLineStartIndex(editor, selection.index) === selection.index && startSegment.startBoundaryIndex > 0) {
    const shiftedStart = getLineStartIndex(editor, startSegment.startBoundaryIndex - 1)
    const shiftedContent = contents.slice(shiftedStart, startSegment.startBoundaryIndex)
    if (startsWithTextInsert(shiftedContent)) {
      return buildSegmentWithShiftedStartBoundary(contents, startSegment, shiftedStart)
    }
  }

  const segment = segments.find((c) => selection.index === c.endBoundaryIndex + 1)
  if (!segment || getLineStartIndex(editor, selection.index) !== selection.index) return null

  const shiftedEnd = getLineEndIndexExclusive(editor, selection.index)
  const shiftedContent = contents.slice(selection.index, shiftedEnd)
  if (!startsWithTextInsert(shiftedContent)) return null

  return buildSegmentWithShiftedEndBoundary(contents, segment, selection.index, shiftedEnd)
}

function handleDeleteForward(
  editor: Quill,
  selection: SelectionRange,
  segments: CenterSegment[],
  contents: Delta,
): Delta | null {
  const startSegment = segments.find((c) => selection.index === c.startBoundaryIndex)
  if (startSegment && startSegment.startBoundaryIndex > 0) {
    const shiftedStart = getLineStartIndex(editor, startSegment.startBoundaryIndex - 1)
    const shiftedContent = contents.slice(shiftedStart, startSegment.startBoundaryIndex)
    if (startsWithTextInsert(shiftedContent)) {
      return buildSegmentWithShiftedStartBoundary(contents, startSegment, shiftedStart)
    }
  }

  const segment = segments.find((c) => selection.index === c.endBoundaryIndex)
  const shiftedStart = selection.index + 1
  if (!segment || shiftedStart >= editor.getLength()) return null
  if (getLineStartIndex(editor, shiftedStart) !== shiftedStart) return null

  const shiftedEnd = getLineEndIndexExclusive(editor, shiftedStart)
  const shiftedContent = contents.slice(shiftedStart, shiftedEnd)
  if (!startsWithTextInsert(shiftedContent)) return null

  return buildSegmentWithShiftedEndBoundary(contents, segment, shiftedStart, shiftedEnd)
}
