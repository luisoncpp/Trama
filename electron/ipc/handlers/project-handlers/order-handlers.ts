import {
  moveFileRequestSchema,
  moveFileResponseSchema,
  reorderFilesRequestSchema,
  type IpcEnvelope,
  type MoveFileResponse,
  type ReorderFilesResponse,
} from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { getActiveIndexService, getActiveProjectRoot, markInternalWrite } from '../../../ipc-runtime.js'
import { documentRepository, reconcileActiveProjectIndex } from './shared.js'

export async function handleReorderFiles(rawPayload: unknown): Promise<IpcEnvelope<ReorderFilesResponse>> {
  const payload = reorderFilesRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for reorder files', payload.error.flatten())
  }

  try {
    const indexService = getActiveIndexService()
    if (!indexService) {
      return errorEnvelope('NO_ACTIVE_PROJECT', 'No active project. Open a project first.')
    }

    await indexService.updateFolderOrder(payload.data.folderPath, payload.data.orderedIds)

    return {
      ok: true,
      data: {
        folderPath: payload.data.folderPath,
        orderedIds: payload.data.orderedIds,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reorder files'
    return errorEnvelope('REORDER_FILES_FAILED', message)
  }
}

export async function handleMoveFile(rawPayload: unknown): Promise<IpcEnvelope<MoveFileResponse>> {
  const payload = moveFileRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for move file', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const result = await documentRepository.moveDocument(projectRoot, payload.data.sourcePath, payload.data.targetFolder)
    markInternalWrite(result.path)
    markInternalWrite(result.renamedTo)
    await reconcileActiveProjectIndex(projectRoot)

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to move file'
    return errorEnvelope('MOVE_FILE_FAILED', message)
  }
}
