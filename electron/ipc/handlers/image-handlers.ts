import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { readImageFileRequestSchema, type IpcEnvelope, type ReadImageFileResponse } from '../../../src/shared/ipc.js'
import { errorEnvelope } from '../../ipc-errors.js'
import { getActiveProjectRoot } from '../../ipc-runtime.js'

function resolveProjectPath(projectRoot: string, relativePath: string): string {
  const absoluteProjectRoot = path.resolve(projectRoot)
  const absoluteTarget = path.resolve(projectRoot, relativePath)
  const rootWithSeparator = `${absoluteProjectRoot}${path.sep}`
  if (absoluteTarget !== absoluteProjectRoot && !absoluteTarget.startsWith(rootWithSeparator)) {
    throw new Error('Path escapes project root')
  }
  return absoluteTarget
}

function getMimeType(filePath: string): string {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/png'
}

export async function handleReadImageFile(rawPayload: unknown): Promise<IpcEnvelope<ReadImageFileResponse>> {
  const payload = readImageFileRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for image read', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const absolutePath = resolveProjectPath(projectRoot, payload.data.path)
    const bytes = await readFile(absolutePath)
    const mimeType = getMimeType(payload.data.path)
    return {
      ok: true,
      data: {
        path: payload.data.path.replace(/\\/g, '/'),
        dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`,
        mimeType,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read image file'
    return errorEnvelope('IMAGE_READ_FAILED', message)
  }
}
