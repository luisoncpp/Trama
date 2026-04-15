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
