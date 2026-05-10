import path from 'node:path'
import { parseDirectiveLine, type BookExportDirective } from './book-export-directives.js'
import {
  extractImageReferences,
  extractImageInfo,
  isReferenceDefinitionLine,
  type ExtractedImageInfo,
} from './book-export-image-utils.js'

export type { ExtractedImageInfo }

export type LineKind = 'directive' | 'referenceDefinition' | 'image' | 'heading' | 'paragraph' | 'paragraph-with-images'

export type ParagraphSegment =
  | { type: 'text'; text: string }
  | { type: 'image'; imageInfo: ExtractedImageInfo }

export interface ParsedLine {
  kind: LineKind
  directive?: BookExportDirective
  imageInfo?: ExtractedImageInfo
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  headingText?: string
  text?: string
  segments?: ParagraphSegment[]
}

function isStandaloneImageLine(line: string): boolean {
  const trimmed = line.trim()
  return /^!\[([^\]]*)\]\(([^)]+)\)$/.test(trimmed)
    || /^!\[([^\]]*)\]\[([^\]]+)\]$/.test(trimmed)
    || /^!\[([^\]]+)\]$/.test(trimmed)
}

function extractInlineImages(line: string, references: Map<string, string>): ParagraphSegment[] {
  const segments: ParagraphSegment[] = []
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)|!\[([^\]]*)\]\[([^\]]+)\]/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = imagePattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = line.slice(lastIndex, match.index)
      if (textBefore) {
        segments.push({ type: 'text', text: textBefore })
      }
    }

    if (match[2] !== undefined) {
      segments.push({ type: 'image', imageInfo: { alt: match[1] ?? '', source: match[2] } })
    } else if (match[4] !== undefined) {
      const ref = match[4].toLowerCase()
      const url = references.get(ref)
      if (url) {
        segments.push({ type: 'image', imageInfo: { alt: match[3] ?? '', source: url } })
      }
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < line.length) {
    const textAfter = line.slice(lastIndex)
    if (textAfter) {
      segments.push({ type: 'text', text: textAfter })
    }
  }

  return segments
}

export function parseLine(line: string, references: Map<string, string>): ParsedLine {
  const directive = parseDirectiveLine(line)
  if (directive) {
    return { kind: 'directive', directive }
  }

  if (isReferenceDefinitionLine(line)) {
    return { kind: 'referenceDefinition' }
  }

  const imageInfo = extractImageInfo(line, references)
  if (imageInfo && isStandaloneImageLine(line)) {
    return { kind: 'image', imageInfo }
  }

  const headingMatch = line.match(/^(#{1,6})\/? ?(.*)$/)
  if (headingMatch) {
    return {
      kind: 'heading',
      headingLevel: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
      headingText: headingMatch[2].trim(),
    }
  }

  const segments = extractInlineImages(line, references)
  if (segments.length > 0) {
    return { kind: 'paragraph-with-images', segments }
  }

  return { kind: 'paragraph', text: line }
}

export async function processChapterContent(
  content: string,
  chapterDir: string,
  handlers: {
    onDirective?: (directive: BookExportDirective) => void | Promise<void>
    onImage?: (imageInfo: ExtractedImageInfo, chapterDir: string) => void | Promise<void>
    onHeading?: (level: number, text: string) => void | Promise<void>
    onParagraph?: (text: string) => void | Promise<void>
    onParagraphWithImages?: (segments: ParagraphSegment[], chapterDir: string) => void | Promise<void>
    onReferenceDefinition?: () => void
  },
): Promise<void> {
  const references = extractImageReferences(content)

  for (const line of content.split('\n')) {
    const parsed = parseLine(line, references)

    switch (parsed.kind) {
      case 'directive':
        await handlers.onDirective?.(parsed.directive!)
        break
      case 'referenceDefinition':
        handlers.onReferenceDefinition?.()
        break
      case 'image':
        await handlers.onImage?.(parsed.imageInfo!, chapterDir)
        break
      case 'heading':
        await handlers.onHeading?.(parsed.headingLevel!, parsed.headingText!)
        break
      case 'paragraph':
        handlers.onParagraph?.(parsed.text!)
        break
      case 'paragraph-with-images':
        await handlers.onParagraphWithImages?.(parsed.segments!, chapterDir)
        break
    }
  }
}
