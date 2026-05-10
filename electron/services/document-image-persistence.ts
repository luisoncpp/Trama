import path from 'node:path'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'

const INLINE_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)\)/gi
const DATA_URL_REGEX = /^data:image\/([a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i

function normalizeRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function isProjectImagePath(source: string): boolean {
  const normalized = normalizeRelativePath(source)
  return normalized.startsWith('res/') && normalized.toLowerCase().endsWith('.png')
}

function createPngDataUrl(bytes: Buffer): string {
  return `data:image/png;base64,${bytes.toString('base64')}`
}

function decodePngDataUrl(dataUrl: string): Buffer {
  const match = DATA_URL_REGEX.exec(dataUrl)
  if (!match) {
    throw new Error('Invalid embedded image data URL')
  }

  const imageType = match[1]?.toLowerCase()
  if (imageType !== 'png') {
    throw new Error('Only PNG embedded images are supported at save time')
  }

  return Buffer.from(match[2] ?? '', 'base64')
}

function collectInlineImageMatches(markdown: string): Array<{ match: string; alt: string; source: string; index: number }> {
  const matches: Array<{ match: string; alt: string; source: string; index: number }> = []
  let match: RegExpExecArray | null
  while ((match = INLINE_IMAGE_REGEX.exec(markdown)) !== null) {
    matches.push({
      match: match[0],
      alt: match[1] ?? '',
      source: match[2] ?? '',
      index: match.index,
    })
  }
  return matches
}

export function collectLinkedImagePaths(markdown: string): string[] {
  return collectInlineImageMatches(markdown)
    .map(({ source }) => normalizeRelativePath(source))
    .filter(isProjectImagePath)
}

function sanitizeDocumentPathForFileName(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath).replace(/\.md$/i, '')
  const sanitized = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return sanitized || 'document'
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function getNextImageIndex(projectRoot: string, filePrefix: string): Promise<number> {
  const resDirectory = path.join(projectRoot, 'res')

  try {
    const entries = await readdir(resDirectory, { withFileTypes: true })
    let maxIndex = -1

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue
      }

      const match = new RegExp(`^${escapeRegex(filePrefix)}(\\d+)\\.png$`, 'i').exec(entry.name)
      if (!match) {
        continue
      }

      const parsed = Number.parseInt(match[1] ?? '', 10)
      if (Number.isFinite(parsed)) {
        maxIndex = Math.max(maxIndex, parsed)
      }
    }

    return maxIndex + 1
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0
    }
    throw error
  }
}

export async function resolveMarkdownImageSources(
  projectRoot: string,
  markdown: string,
): Promise<{ markdown: string; linkedImagePaths: string[] }> {
  const matches = collectInlineImageMatches(markdown)
  if (matches.length === 0) {
    return { markdown, linkedImagePaths: [] }
  }

  const linkedImagePaths: string[] = []
  let cursor = 0
  let output = ''

  for (const match of matches) {
    output += markdown.slice(cursor, match.index)

    const normalizedSource = normalizeRelativePath(match.source)
    if (!isProjectImagePath(normalizedSource)) {
      output += match.match
      cursor = match.index + match.match.length
      continue
    }

    const absoluteImagePath = path.join(projectRoot, normalizedSource)
    const imageBytes = await readFile(absoluteImagePath)
    linkedImagePaths.push(normalizedSource)
    output += `![${match.alt}](${createPngDataUrl(imageBytes)})`
    cursor = match.index + match.match.length
  }

  output += markdown.slice(cursor)
  return { markdown: output, linkedImagePaths }
}

export async function materializeMarkdownImages(
  projectRoot: string,
  relativePath: string,
  markdown: string,
  existingMarkdown: string,
): Promise<{ markdown: string; affectedImagePaths: string[] }> {
  const matches = collectInlineImageMatches(markdown)
  const existingLinked = collectLinkedImagePaths(existingMarkdown)

  if (matches.length === 0) {
    await Promise.all(existingLinked.map(async (imagePath) => rm(path.join(projectRoot, imagePath), { force: true })))
    return { markdown, affectedImagePaths: existingLinked }
  }

  const nextLinked = new Set<string>()
  const affectedImagePaths = new Set<string>()
  const fileBaseName = `${sanitizeDocumentPathForFileName(relativePath)}_`
  let nextImageIndex = await getNextImageIndex(projectRoot, fileBaseName)
  let reusedImageIndex = 0
  let cursor = 0
  let output = ''

  for (const match of matches) {
    output += markdown.slice(cursor, match.index)
    const normalizedSource = normalizeRelativePath(match.source)

    if (normalizedSource.startsWith('data:image/')) {
      const reusedPath = existingLinked[reusedImageIndex]
      const targetPath = reusedPath ?? `res/${fileBaseName}${nextImageIndex++}.png`
      const absoluteImagePath = path.join(projectRoot, targetPath)

      await mkdir(path.dirname(absoluteImagePath), { recursive: true })
      await writeFile(absoluteImagePath, decodePngDataUrl(normalizedSource))

      nextLinked.add(targetPath)
      affectedImagePaths.add(targetPath)
      output += `![${match.alt}](${targetPath})`
      reusedImageIndex += 1
      cursor = match.index + match.match.length
      continue
    }

    if (isProjectImagePath(normalizedSource)) {
      nextLinked.add(normalizedSource)
    }

    output += match.match
    cursor = match.index + match.match.length
  }

  output += markdown.slice(cursor)

  for (const oldImagePath of existingLinked) {
    if (nextLinked.has(oldImagePath)) {
      continue
    }

    await rm(path.join(projectRoot, oldImagePath), { force: true })
    affectedImagePaths.add(oldImagePath)
  }

  return { markdown: output, affectedImagePaths: Array.from(affectedImagePaths) }
}
