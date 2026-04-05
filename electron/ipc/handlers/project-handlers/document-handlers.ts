import {
  createDocumentRequestSchema,
  createFolderRequestSchema,
  readDocumentRequestSchema,
  saveDocumentRequestSchema,
  type CreateDocumentResponse,
  type CreateFolderResponse,
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

async function reconcileActiveProjectIndex(projectRoot: string): Promise<void> {
  const indexService = getActiveIndexService()
  if (!indexService) {
    return
  }

  const { markdownFiles } = await scanProject(projectRoot)
  const metaByPath = await readMetaByPath(projectRoot, markdownFiles)
  await indexService.reconcileIndex(markdownFiles, metaByPath)
}

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

    await reconcileActiveProjectIndex(projectRoot)

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save document'
    return errorEnvelope('DOCUMENT_SAVE_FAILED', message)
  }
}

export async function handleCreateDocument(rawPayload: unknown): Promise<IpcEnvelope<CreateDocumentResponse>> {
  const payload = createDocumentRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for document create', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const result = await documentRepository.createDocument(
      projectRoot,
      payload.data.path,
      payload.data.initialContent,
    )
    markInternalWrite(result.path)
    await reconcileActiveProjectIndex(projectRoot)

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create document'
    return errorEnvelope('DOCUMENT_CREATE_FAILED', message)
  }
}

export async function handleCreateFolder(rawPayload: unknown): Promise<IpcEnvelope<CreateFolderResponse>> {
  const payload = createFolderRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for folder create', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const result = await documentRepository.createFolder(projectRoot, payload.data.path)
    await reconcileActiveProjectIndex(projectRoot)

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create folder'
    return errorEnvelope('FOLDER_CREATE_FAILED', message)
  }
}
