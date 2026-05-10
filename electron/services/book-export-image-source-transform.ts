import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import {
  bytesToDataUrl,
  loadImageBytes,
  parseDataUrl,
  resolveImagePath,
} from './book-export-image-utils.js'

const INLINE_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g
const REFERENCE_DEFINITION_PATTERN = /^\[([^\]]+)\]:\s*<?([^>\s]+)>?/gm

type ReplaceSource = (source: string) => Promise<string | null>

async function replaceMatches(
  content: string,
  pattern: RegExp,
  buildReplacement: (match: RegExpExecArray) => Promise<string>,
): Promise<string> {
  const matches = Array.from(content.matchAll(pattern)) as RegExpExecArray[]
  if (matches.length === 0) return content

  let cursor = 0
  let result = ''
  for (const match of matches) {
    const start = match.index ?? 0
    result += content.slice(cursor, start)
    result += await buildReplacement(match)
    cursor = start + match[0].length
  }

  result += content.slice(cursor)
  return result
}

export async function replaceMarkdownImageSources(content: string, replaceSource: ReplaceSource): Promise<string> {
  const withInlineImages = await replaceMatches(content, INLINE_IMAGE_PATTERN, async (match) => {
    const replacement = await replaceSource(match[2])
    return replacement ? `![${match[1]}](${replacement})` : match[0]
  })

  return replaceMatches(withInlineImages, REFERENCE_DEFINITION_PATTERN, async (match) => {
    const replacement = await replaceSource(match[2])
    return replacement ? `[${match[1]}]: <${replacement}>` : match[0]
  })
}

function shouldSkipLocalEmbedding(source: string): boolean {
  return source.startsWith('data:image/')
    || source.startsWith('http://')
    || source.startsWith('https://')
    || source.startsWith('file://')
}

export async function convertMarkdownLocalImageSourcesToDataUrls(
  content: string,
  projectRoot: string,
  chapterPath: string,
): Promise<string> {
  if (!projectRoot.trim()) return content

  const chapterDir = path.dirname(chapterPath)
  return replaceMarkdownImageSources(content, async (source) => {
    if (shouldSkipLocalEmbedding(source)) return null

    try {
      const resolvedPath = await resolveImagePath(source, projectRoot, chapterDir)
      const { bytes, type } = await loadImageBytes(resolvedPath)
      if (!bytes || !type) return null
      return bytesToDataUrl(bytes, type)
    } catch (error) {
      console.warn(
        `[book-export] Failed to embed local image source: ${source}`,
        error instanceof Error ? error.message : String(error),
      )
      return null
    }
  })
}

export async function convertMarkdownImageSourcesToEpubUrls(
  content: string,
  projectRoot: string,
  chapterPath: string,
  tempImageDir: string,
  toFileUrl: (absolutePath: string) => string,
): Promise<string> {
  const chapterDir = path.dirname(chapterPath)
  return replaceMarkdownImageSources(content, async (source) => {
    if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('file://')) {
      return null
    }

    try {
      if (source.startsWith('data:image/')) {
        const parsed = parseDataUrl(source)
        if (!parsed.type || !parsed.bytes) return null
        const tempPath = path.join(tempImageDir, `${randomUUID()}.${parsed.type === 'png' ? 'png' : 'jpg'}`)
        await writeFile(tempPath, parsed.bytes)
        return toFileUrl(tempPath)
      }

      if (!projectRoot.trim()) return null
      const imageFilePath = await resolveImagePath(source, projectRoot, chapterDir)
      return toFileUrl(imageFilePath)
    } catch (error) {
      console.warn(
        `[book-export] Failed to prepare EPUB image source: ${source}`,
        error instanceof Error ? error.message : String(error),
      )
      return null
    }
  })
}
