import type { IpcEnvelope, ProjectSnapshot } from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { getActiveIndexService } from '../../../ipc-runtime.js'

export async function handleGetIndex(): Promise<IpcEnvelope<ProjectSnapshot['index']>> {
  const indexService = getActiveIndexService()
  if (!indexService) {
    return errorEnvelope('NO_ACTIVE_PROJECT', 'No active project. Open a project first.')
  }

  try {
    const index = await indexService.loadIndex()
    return {
      ok: true,
      data: index,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read index'
    return errorEnvelope('INDEX_READ_FAILED', message)
  }
}
