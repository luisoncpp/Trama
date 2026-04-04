import {
  readDocumentRequestSchema,
  saveDocumentRequestSchema,
  type IpcEnvelope,
  type ReadDocumentResponse,
  type SaveDocumentResponse,
} from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import {
  getActiveIndexService,
  getActiveProjectRoot,
  markInternalWrite,
} from '../../../ipc-runtime.js'
import { scanProject } from '../../../services/project-scanner.js'
import { documentRepository, readMetaByPath } from './shared.js'

export async function handleReadDocument(rawPayload: unknown): Promise<IpcEnvelope<ReadDocumentResponse>> {
  const payload = readDocumentRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for document read', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const document = await documentRepository.readDocument(projectRoot, payload.data.path)

    return {
      ok: true,
      data: document,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read document'
    return errorEnvelope('DOCUMENT_READ_FAILED', message)
  }
}

export async function handleSaveDocument(rawPayload: unknown): Promise<IpcEnvelope<SaveDocumentResponse>> {
  const payload = saveDocumentRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for document save', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    markInternalWrite(payload.data.path)

    const result = await documentRepository.saveDocument(
      projectRoot,
      payload.data.path,
      payload.data.content,
      payload.data.meta,
    )

    const indexService = getActiveIndexService()
    if (indexService) {
      const { markdownFiles } = await scanProject(projectRoot)
      const metaByPath = await readMetaByPath(projectRoot, markdownFiles)
      await indexService.reconcileIndex(markdownFiles, metaByPath)
    }

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save document'
    return errorEnvelope('DOCUMENT_SAVE_FAILED', message)
  }
}
