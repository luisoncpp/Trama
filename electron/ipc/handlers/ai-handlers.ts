import type { IpcMainInvokeEvent } from 'electron'
import type {
  IpcEnvelope,
  AiImportRequest,
  AiImportPreview,
  AiImportResponse,
  AiExportRequest,
  AiExportResponse,
} from '../../../src/shared/ipc.js'
import {
  aiImportRequestSchema,
  aiExportRequestSchema,
} from '../../../src/shared/ipc.js'
import { errorEnvelope } from '../../ipc-errors.js'
import {
  parseClipboardContent,
  previewImport as previewImportService,
  executeImport as executeImportService,
} from '../../services/ai-import-service.js'
import { formatExportContent } from '../../services/ai-export-service.js'

export async function handleAiImportPreview(
  _event: IpcMainInvokeEvent,
  rawPayload: unknown,
): Promise<IpcEnvelope<AiImportPreview>> {
  const payload = aiImportRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for AI import preview', payload.error.flatten())
  }

  try {
    const parsedFiles = parseClipboardContent(payload.data.clipboardContent)
    const preview = await previewImportService(parsedFiles, payload.data.projectRoot)
    return { ok: true, data: preview }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to preview AI import'
    return errorEnvelope('AI_IMPORT_PREVIEW_FAILED', message)
  }
}

export async function handleAiImport(
  _event: IpcMainInvokeEvent,
  rawPayload: unknown,
): Promise<IpcEnvelope<AiImportResponse>> {
  const payload = aiImportRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for AI import', payload.error.flatten())
  }

  try {
    const parsedFiles = parseClipboardContent(payload.data.clipboardContent)
    const result = await executeImportService(parsedFiles, payload.data.projectRoot)
    return { ok: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to execute AI import'
    return errorEnvelope('AI_IMPORT_FAILED', message)
  }
}

export async function handleAiExport(
  _event: IpcMainInvokeEvent,
  rawPayload: unknown,
): Promise<IpcEnvelope<AiExportResponse>> {
  const payload = aiExportRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for AI export', payload.error.flatten())
  }

  try {
    const result = formatExportContent(
      payload.data.filePaths,
      payload.data.projectRoot,
      payload.data.includeFrontmatter,
    )
    return { ok: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to execute AI export'
    return errorEnvelope('AI_EXPORT_FAILED', message)
  }
}
