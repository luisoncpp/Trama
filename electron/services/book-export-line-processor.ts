import path from 'node:path'
import { parseDirectiveLine, type BookExportDirective } from './book-export-directives.js'
import {
  extractImageReferences,
  extractImageInfo,
  isReferenceDefinitionLine,
  type ExtractedImageInfo,
} from './book-export-image-utils.js'

export type { ExtractedImageInfo }

export type LineKind = 'directive' | 'referenceDefinition' | 'image' | 'heading' | 'paragraph'

export interface ParsedLine {
  kind: LineKind
  directive?: BookExportDirective
  imageInfo?: ExtractedImageInfo
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  headingText?: string
  text?: string
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
  if (imageInfo) {
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
    }
  }
}
