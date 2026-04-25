import { dialog } from 'electron'
import { readFileSync } from 'node:fs'

function readZuluFile(filePath: string): string {
  const buffer = readFileSync(filePath)

  const header = buffer.toString('ascii', 0, Math.min(200, buffer.length))
  const encodingMatch = /encoding\s*=\s*["']([^"']+)["']/i.exec(header)
  if (encodingMatch) {
    try { return buffer.toString(encodingMatch[1] as BufferEncoding) } catch { /* fall through */ }
  }

  const utf8Content = buffer.toString('utf-8')
  if (utf8Content.includes('\uFFFD')) {
    return buffer.toString('latin1')
  }

  return utf8Content
}
import type { IpcMainInvokeEvent } from 'electron'
import type {
  IpcEnvelope,
  ZuluImportPreviewResponse,
  ZuluImportPreviewRequest,
  ZuluImportRequest,
  ZuluImportResponse,
  ZuluSelectFileResponse,
} from '../../../src/shared/ipc.js'
import {
  zuluImportPreviewRequestSchema,
  zuluImportRequestSchema,
} from '../../../src/shared/ipc.js'
import { errorEnvelope } from '../../ipc-errors.js'
import { parseZuluContent } from '../../../src/shared/zulu-parser.js'
import { previewZuluImport, executeZuluImport } from '../../services/zulu-import-service.js'

export async function handleZuluSelectFile(): Promise<IpcEnvelope<ZuluSelectFileResponse>> {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select a ZuluPad file (.zulu)',
      filters: [
        { name: 'ZuluPad Files', extensions: ['zulu'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: true, data: { filePath: '', content: '', pageCount: 0 } }
    }

    const filePath = result.filePaths[0]
    const content = readZuluFile(filePath)
    const pages = parseZuluContent(content)

    return {
      ok: true,
      data: {
        filePath,
        content,
        pageCount: pages.length,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to select ZuluPad file'
    return errorEnvelope('ZULU_SELECT_FILE_FAILED', message)
  }
}

export async function handleZuluImportPreview(
  _event: IpcMainInvokeEvent,
  rawPayload: unknown,
): Promise<IpcEnvelope<ZuluImportPreviewResponse>> {
  const payload = zuluImportPreviewRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for Zulu import preview', payload.error.flatten())
  }

  try {
    const preview = previewZuluImport(payload.data.content, payload.data.targetFolder)
    return { ok: true, data: preview }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to preview Zulu import'
    return errorEnvelope('ZULU_IMPORT_PREVIEW_FAILED', message)
  }
}

export async function handleZuluImport(
  _event: IpcMainInvokeEvent,
  rawPayload: unknown,
): Promise<IpcEnvelope<ZuluImportResponse>> {
  const payload = zuluImportRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for Zulu import', payload.error.flatten())
  }

  try {
    const result = await executeZuluImport(
      payload.data.content,
      payload.data.targetFolder,
      payload.data.projectRoot,
      payload.data.tagMode,
    )
    return { ok: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to execute Zulu import'
    return errorEnvelope('ZULU_IMPORT_FAILED', message)
  }
}
