import { parseDirectiveLine, stripLeadingPagebreakAndBlankLines } from './book-export-directives.js'
import type { BookExportChapter } from './book-export-renderers.js'

/** One printable unit: ordered slice of chapter bodies (markdown, still sanitized). */
export interface PdfExportSegment {
  /** Chapters fully or partially included, in export order. */
  chapters: Array<{
    path: string
    /** Markdown for this segment only (subset of chapter.content). */
    content: string
  }>
}

type SegmentChapterBuilder = {
  path: string
  lines: string[]
}

function segmentHasContent(builders: SegmentChapterBuilder[]): boolean {
  return builders.some((chapter) => chapter.lines.join('\n').trim().length > 0)
}

function stripLeadingAuthorPagebreaks(chapters: BookExportChapter[]): BookExportChapter[] {
  if (chapters.length === 0) {
    return chapters
  }

  const stripped = stripLeadingPagebreakAndBlankLines(chapters[0].content)
  if (stripped === chapters[0].content) {
    return chapters
  }

  return [{ ...chapters[0], content: stripped }, ...chapters.slice(1)]
}

function buildersToSegment(builders: SegmentChapterBuilder[]): PdfExportSegment {
  return {
    chapters: builders.map((chapter) => ({
      path: chapter.path,
      content: chapter.lines.join('\n'),
    })),
  }
}

function getOrCreateChapterSlice(
  builders: SegmentChapterBuilder[],
  path: string,
): SegmentChapterBuilder {
  const last = builders[builders.length - 1]
  if (last?.path === path) {
    return last
  }

  const slice: SegmentChapterBuilder = { path, lines: [] }
  builders.push(slice)
  return slice
}

function appendInterDocumentGap(builders: SegmentChapterBuilder[]): void {
  if (builders.length === 0) {
    return
  }

  builders[builders.length - 1].lines.push('', '')
}

function flushSegment(
  builders: SegmentChapterBuilder[],
  segments: PdfExportSegment[],
): void {
  if (!segmentHasContent(builders)) {
    return
  }

  segments.push(buildersToSegment(builders))
}

export function segmentHasPrintableContent(segment: PdfExportSegment): boolean {
  return segment.chapters.some((chapter) => chapter.content.trim().length > 0)
}

export function buildPdfExportSegments(chapters: BookExportChapter[]): PdfExportSegment[] {
  const normalizedChapters = stripLeadingAuthorPagebreaks(chapters)
  const segments: PdfExportSegment[] = []
  let current: SegmentChapterBuilder[] = []
  let lastEndedWithPagebreak = false

  for (let chapterIndex = 0; chapterIndex < normalizedChapters.length; chapterIndex += 1) {
    const chapter = normalizedChapters[chapterIndex]

    if (chapterIndex > 0 && !lastEndedWithPagebreak) {
      appendInterDocumentGap(current)
    }

    for (const line of chapter.content.split('\n')) {
      const directive = parseDirectiveLine(line)
      if (directive?.kind === 'pagebreak') {
        flushSegment(current, segments)
        current = []
        lastEndedWithPagebreak = true
        continue
      }

      getOrCreateChapterSlice(current, chapter.path).lines.push(line)
      lastEndedWithPagebreak = false
    }
  }

  flushSegment(current, segments)
  return segments
}
