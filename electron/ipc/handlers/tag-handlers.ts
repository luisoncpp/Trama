import { IPC_CHANNELS, type IpcEnvelope } from '../../../src/shared/ipc.js'
import { type TagGetIndexResponse, type TagResolveRequest, type TagResolveResponse, tagGetIndexResponseSchema, tagResolveRequestSchema, tagResolveResponseSchema } from '../../../src/shared/ipc-tag.js'
import { errorEnvelope } from '../../ipc-errors.js'
import { getActiveTagIndexService } from '../../ipc-runtime.js'

export async function handleTagGetIndex(): Promise<IpcEnvelope<TagGetIndexResponse>> {
  const tagIndexService = getActiveTagIndexService()
  if (!tagIndexService) {
    return errorEnvelope('NO_ACTIVE_PROJECT', 'No active project - tag index not available')
  }

  try {
    const tags: Record<string, string> = {}
    const map = (tagIndexService as unknown as { tagToPath: Map<string, string> }).tagToPath
    for (const [tag, path] of map.entries()) {
      tags[tag] = path
    }
    return { ok: true, data: { tags } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get tag index'
    return errorEnvelope('TAG_INDEX_ERROR', message)
  }
}

export async function handleTagResolve(rawPayload: unknown): Promise<IpcEnvelope<TagResolveResponse>> {
  const payload = tagResolveRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for tag resolve', payload.error.flatten())
  }

  const tagIndexService = getActiveTagIndexService()
  if (!tagIndexService) {
    return errorEnvelope('NO_ACTIVE_PROJECT', 'No active project - tag index not available')
  }

  try {
    const matches = tagIndexService.resolveMatches(payload.data.text)
    return { ok: true, data: { matches } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve tags'
    return errorEnvelope('TAG_RESOLVE_ERROR', message)
  }
}
