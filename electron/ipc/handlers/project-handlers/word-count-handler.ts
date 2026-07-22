// @Architecture(descriptionShort="IPC handler for calculating section word counts on demand")
import {
  getWordCountsRequestSchema,
  type IpcEnvelope,
  type WordCountsResponse,
} from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { getProjectCache } from '../../../services/project-state-cache.js'
import { scanProject } from '../../../services/project-scanner.js'
import { calculateSectionWordCounts } from '../../../services/word-count-service.js'

export async function handleGetWordCounts(
  rawPayload: unknown,
): Promise<IpcEnvelope<WordCountsResponse>> {
  const payload = getWordCountsRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for word counts', payload.error.flatten())
  }

  try {
    const { projectRoot } = payload.data
    const cache = getProjectCache(projectRoot)
    let markdownFiles: string[]

    if (cache) {
      markdownFiles = cache.markdownFiles
    } else {
      const scanResult = await scanProject(projectRoot)
      markdownFiles = scanResult.markdownFiles
    }

    const data = await calculateSectionWordCounts(projectRoot, markdownFiles)

    return {
      ok: true,
      data,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to calculate section word counts'
    return errorEnvelope('WORD_COUNTS_FAILED', message)
  }
}
