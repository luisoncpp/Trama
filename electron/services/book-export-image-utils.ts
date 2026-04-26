import path from 'node:path'
import { readFile } from 'node:fs/promises'

export interface ParsedDataUrl {
  type: 'png' | 'jpeg' | null
  bytes: Uint8Array | null
}

export async function resolveImagePath(imagePath: string, projectRoot: string, chapterDir: string): Promise<string> {
  if (imagePath.startsWith('data:image/')) {
    return imagePath
  }
  return path.resolve(projectRoot, chapterDir, imagePath)
}

export function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
  if (!match) return { type: null, bytes: null }
  const mimeType = match[1].toLowerCase()
  const type = mimeType === 'jpeg' || mimeType === 'jpg' ? 'jpeg' : mimeType === 'png' ? 'png' : null
  if (!type) return { type: null, bytes: null }
  const binaryString = Buffer.from(match[2], 'base64').toString('binary')
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return { type, bytes }
}

export async function loadImageBytes(imagePath: string): Promise<{ type: 'png' | 'jpeg' | null; bytes: Uint8Array | null }> {
  if (imagePath.startsWith('data:image/')) {
    return parseDataUrl(imagePath)
  }

  try {
    const fileBytes = await readFile(imagePath)
    const ext = path.extname(imagePath).toLowerCase()
    const bytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes)
    const type = ext === '.png' ? 'png' : ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : null
    return { type, bytes }
  } catch {
    return { type: null, bytes: null }
  }
}

export function getImageMimeType(type: 'png' | 'jpeg' | null): string | null {
  if (type === 'png') return 'image/png'
  if (type === 'jpeg') return 'image/jpeg'
  return null
}

export function bytesToDataUrl(bytes: Uint8Array, type: 'png' | 'jpeg' | null): string {
  if (!type) return ''
  const mimeType = getImageMimeType(type)
  if (!mimeType) return ''
  const base64 = Buffer.from(bytes).toString('base64')
  return `data:${mimeType};base64,${base64}`
}

export function extractImageReferences(content: string): Map<string, string> {
  const references = new Map<string, string>()
  const pattern = /^\[([^\]]+)\]:\s*<?([^>\s]+)>?/gm
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) {
    const ref = match[1].toLowerCase()
    const url = match[2]
    if (!references.has(ref)) {
      references.set(ref, url)
    }
  }
  return references
}

export interface ExtractedImageInfo {
  alt: string
  source: string
}

export function extractImageInfo(line: string, references: Map<string, string>): ExtractedImageInfo | null {
  const trimmed = line.trim()

  const inlineMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
  if (inlineMatch) {
    return { alt: inlineMatch[1], source: inlineMatch[2] }
  }

  const refExplicitMatch = trimmed.match(/^!\[([^\]]*)\]\[([^\]]+)\]$/)
  if (refExplicitMatch) {
    const ref = refExplicitMatch[2].toLowerCase()
    const url = references.get(ref)
    if (url) {
      return { alt: refExplicitMatch[1], source: url }
    }
    return null
  }

  const refImplicitMatch = trimmed.match(/^!\[([^\]]+)\]$/)
  if (refImplicitMatch) {
    const ref = refImplicitMatch[1].toLowerCase()
    const url = references.get(ref)
    if (url) {
      return { alt: refImplicitMatch[1], source: url }
    }
    return null
  }

  return null
}

export function isReferenceDefinitionLine(line: string): boolean {
  return /^\[([^\]]+)\]:\s*<?([^>\s]+)>?/.test(line.trim())
}

export interface ImageDimensions {
  width: number
  height: number
}

export function getImageDimensions(bytes: Uint8Array, type: 'png' | 'jpeg' | null): ImageDimensions | null {
  if (type === 'png') return getPngDimensions(bytes)
  if (type === 'jpeg') return getJpegDimensions(bytes)
  return null
}

function getPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i += 1) {
    if (bytes[i] !== signature[i]) return null
  }
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function getJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let offset = 0
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    if (marker === 0xd8) {
      offset += 2
      continue
    }
    if (marker === 0xd9) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2
      continue
    }
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2
    ) {
      if (offset + 9 >= bytes.length) return null
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6]
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8]
      if (width <= 0 || height <= 0) return null
      return { width, height }
    }
    if (offset + 3 >= bytes.length) break
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3]
    offset += 2 + segmentLength
  }
  return null
}

export function calculateDocxImageSize(
  dimensions: ImageDimensions,
  maxWidthPx = 600,
  maxHeightPx = 800,
): { width: number; height: number } {
  const scale = Math.min(maxWidthPx / dimensions.width, maxHeightPx / dimensions.height, 1)
  return {
    width: Math.round(dimensions.width * scale),
    height: Math.round(dimensions.height * scale),
  }
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
