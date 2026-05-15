import type Quill from 'quill'
import Delta from 'quill-delta'
import { LAYOUT_DIRECTIVE_BLOT_NAME } from './rich-markdown-editor-layout-blots'

type DeltaInsert = string | Record<string, unknown>

interface DeltaOp {
  insert?: DeltaInsert
}

interface SelectionRange {
  index: number
  length: number
}

export type CenterDeleteDirection = 'backspace' | 'delete'

export interface CenterBoundary {
  index: number
  role: 'start' | 'end'
}

export interface CenterSegment {
  startBoundaryIndex: number
  endBoundaryIndex: number
  contentStartIndex: number
  contentEndIndexExclusive: number
}

export interface LineRange {
  startIndex: number
  endIndexExclusive: number
}

function getOpLength(insert: DeltaInsert | undefined): number {
  if (typeof insert === 'string') {
    return insert.length
  }

  if (insert && typeof insert === 'object') {
    return 1
  }

  return 0
}

function readCenterBoundaryFromInsert(insert: DeltaInsert | undefined, index: number): CenterBoundary | null {
  if (!insert || typeof insert !== 'object') {
    return null
  }

  const directiveInsert = (insert as Record<string, unknown>)[LAYOUT_DIRECTIVE_BLOT_NAME]
  if (!directiveInsert || typeof directiveInsert !== 'object') {
    return null
  }

  const directive = directiveInsert as { directive?: string; role?: string }
  if (directive.directive !== 'center') {
    return null
  }

  return {
    index,
    role: directive.role === 'end' ? 'end' : 'start',
  }
}

function getLineStartIndex(editor: Quill, index: number): number {
  const [line, offset] = editor.getLine(index)
  if (!line) {
    return Math.max(0, index)
  }

  return index - offset
}

function getLineEndIndexExclusive(editor: Quill, index: number): number {
  const [line] = editor.getLine(index)
  if (!line) {
    return Math.max(0, index)
  }

  const lineStart = getLineStartIndex(editor, index)
  return lineStart + line.length()
}

function startsWithTextInsert(delta: Delta): boolean {
  return typeof delta.ops[0]?.insert === 'string'
}

function buildSegmentWithShiftedEndBoundary(
  contents: Delta,
  segment: CenterSegment,
  movedContentStartIndex: number,
  movedContentEndIndexExclusive: number,
): Delta {
  const prefix = contents.slice(0, segment.endBoundaryIndex)
  const shiftedContent = contents.slice(movedContentStartIndex, movedContentEndIndexExclusive)
  const endBoundary = contents.slice(segment.endBoundaryIndex, segment.endBoundaryIndex + 1)
  const suffix = contents.slice(movedContentEndIndexExclusive)

  return new Delta()
    .concat(prefix)
    .concat(shiftedContent)
    .concat(endBoundary)
    .concat(suffix)
}

function buildSegmentWithShiftedStartBoundary(
  contents: Delta,
  segment: CenterSegment,
  movedContentStartIndex: number,
): Delta {
  const prefix = contents.slice(0, movedContentStartIndex)
  const startBoundary = contents.slice(segment.startBoundaryIndex, segment.startBoundaryIndex + 1)
  const shiftedContent = contents.slice(movedContentStartIndex, segment.startBoundaryIndex)
  const centeredContent = contents.slice(segment.contentStartIndex, segment.endBoundaryIndex + 1)
  const suffix = contents.slice(segment.endBoundaryIndex + 1)

  return new Delta()
    .concat(prefix)
    .concat(startBoundary)
    .concat(shiftedContent)
    .concat(centeredContent)
    .concat(suffix)
}

export function extractCenterBoundariesFromOps(ops: readonly DeltaOp[]): CenterBoundary[] {
  const boundaries: CenterBoundary[] = []
  let offset = 0

  for (const op of ops) {
    const boundary = readCenterBoundaryFromInsert(op.insert, offset)
    if (boundary) {
      boundaries.push(boundary)
    }
    offset += getOpLength(op.insert)
  }

  return boundaries
}

export function deriveCenterSegments(boundaries: readonly CenterBoundary[]): CenterSegment[] {
  const segments: CenterSegment[] = []
  let openStartBoundaryIndex: number | null = null

  for (const boundary of boundaries) {
    if (boundary.role === 'start') {
      if (openStartBoundaryIndex === null) {
        openStartBoundaryIndex = boundary.index
      }
      continue
    }

    if (openStartBoundaryIndex === null) {
      continue
    }

    if (boundary.index < openStartBoundaryIndex) {
      continue
    }

    segments.push({
      startBoundaryIndex: openStartBoundaryIndex,
      endBoundaryIndex: boundary.index,
      contentStartIndex: openStartBoundaryIndex + 1,
      contentEndIndexExclusive: boundary.index,
    })
    openStartBoundaryIndex = null
  }

  return segments
}

export function getCenterSegments(editor: Quill): CenterSegment[] {
  const ops = (editor.getContents().ops ?? []) as DeltaOp[]
  const boundaries = extractCenterBoundariesFromOps(ops)
  return deriveCenterSegments(boundaries)
}

export function isIndexInCenterSegment(index: number, segment: CenterSegment): boolean {
  return index >= segment.contentStartIndex && index < segment.contentEndIndexExclusive
}

export function findCenterSegmentAtIndex(editor: Quill, index: number): CenterSegment | null {
  const segments = getCenterSegments(editor)
  for (const segment of segments) {
    if (isIndexInCenterSegment(index, segment)) {
      return segment
    }
  }

  return null
}

export function normalizeSelectionToLineRange(editor: Quill, selection: SelectionRange | null): LineRange {
  const baseIndex = selection?.index ?? Math.max(0, editor.getLength() - 1)
  const safeLength = Math.max(0, selection?.length ?? 0)
  const startIndex = getLineStartIndex(editor, baseIndex)
  const endProbe = safeLength > 0 ? baseIndex + safeLength - 1 : baseIndex
  const endIndexExclusive = getLineEndIndexExclusive(editor, endProbe)

  return {
    startIndex,
    endIndexExclusive,
  }
}

export function buildBoundarySafeDeleteContents(
  editor: Quill,
  selection: SelectionRange | null,
  direction: CenterDeleteDirection,
): Delta | null {
  if (!selection || selection.length !== 0) {
    return null
  }

  const segments = getCenterSegments(editor)
  const contents = editor.getContents() as Delta

  if (direction === 'backspace') {
    if (selection.index <= 0) {
      return null
    }

    const startSegment = segments.find((candidate) => selection.index === candidate.startBoundaryIndex + 1)
    if (startSegment && getLineStartIndex(editor, selection.index) === selection.index && startSegment.startBoundaryIndex > 0) {
      const shiftedContentStartIndex = getLineStartIndex(editor, startSegment.startBoundaryIndex - 1)
      const shiftedContent = contents.slice(shiftedContentStartIndex, startSegment.startBoundaryIndex)
      if (startsWithTextInsert(shiftedContent)) {
        return buildSegmentWithShiftedStartBoundary(contents, startSegment, shiftedContentStartIndex)
      }
    }

    const segment = segments.find((candidate) => selection.index === candidate.endBoundaryIndex + 1)
    if (!segment || getLineStartIndex(editor, selection.index) !== selection.index) {
      return null
    }

    const shiftedContentEndIndexExclusive = getLineEndIndexExclusive(editor, selection.index)
    const shiftedContent = contents.slice(selection.index, shiftedContentEndIndexExclusive)
    if (!startsWithTextInsert(shiftedContent)) {
      return null
    }

    return buildSegmentWithShiftedEndBoundary(contents, segment, selection.index, shiftedContentEndIndexExclusive)
  }

  const startSegment = segments.find((candidate) => selection.index === candidate.startBoundaryIndex)
  if (startSegment && startSegment.startBoundaryIndex > 0) {
    const shiftedContentStartIndex = getLineStartIndex(editor, startSegment.startBoundaryIndex - 1)
    const shiftedContent = contents.slice(shiftedContentStartIndex, startSegment.startBoundaryIndex)
    if (startsWithTextInsert(shiftedContent)) {
      return buildSegmentWithShiftedStartBoundary(contents, startSegment, shiftedContentStartIndex)
    }
  }

  const segment = segments.find((candidate) => selection.index === candidate.endBoundaryIndex)
  const shiftedContentStartIndex = selection.index + 1
  if (!segment || shiftedContentStartIndex >= editor.getLength()) {
    return null
  }

  if (getLineStartIndex(editor, shiftedContentStartIndex) !== shiftedContentStartIndex) {
    return null
  }

  const shiftedContentEndIndexExclusive = getLineEndIndexExclusive(editor, shiftedContentStartIndex)
  const shiftedContent = contents.slice(shiftedContentStartIndex, shiftedContentEndIndexExclusive)
  if (!startsWithTextInsert(shiftedContent)) {
    return null
  }

  return buildSegmentWithShiftedEndBoundary(contents, segment, shiftedContentStartIndex, shiftedContentEndIndexExclusive)
}
