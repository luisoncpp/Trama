import {
  createRelationshipsDocumentRequestSchema,
  type CreateRelationshipsDocumentResponse,
  type IpcEnvelope,
} from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { getActiveProjectRoot, markInternalWrite } from '../../../ipc-runtime.js'
import { documentRepository, reconcileActiveProjectIndex } from './shared.js'

export async function handleCreateRelationshipsDocument(rawPayload: unknown): Promise<IpcEnvelope<CreateRelationshipsDocumentResponse>> {
  const payload = createRelationshipsDocumentRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for relationships document create', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const result = await documentRepository.createRelationshipsDocument(
      projectRoot,
      payload.data.path,
      payload.data.name,
    )
    markInternalWrite(result.path)

    await reconcileActiveProjectIndex(projectRoot, { changedFiles: [result.path] })

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create relationships document'
    return errorEnvelope('DOCUMENT_CREATE_FAILED', message)
  }
}
