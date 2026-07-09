// @Architecture(descriptionShort="Whole-project markdown search handler")
import {
  searchProjectRequestSchema,
  type IpcEnvelope,
  type SearchProjectResponse,
} from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { getActiveProjectRoot } from '../../../ipc-runtime.js'
import { searchProjectMarkdown } from '../../../services/project-search-service.js'

export async function handleSearchProject(rawPayload: unknown): Promise<IpcEnvelope<SearchProjectResponse>> {
  const payload = searchProjectRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for project search', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const files = await searchProjectMarkdown(projectRoot, payload.data)

    return {
      ok: true,
      data: { files },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to search project'
    return errorEnvelope('PROJECT_SEARCH_FAILED', message)
  }
}
