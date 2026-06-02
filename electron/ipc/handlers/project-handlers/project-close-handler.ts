import type { IpcEnvelope } from '../../../../src/shared/ipc.js'
import type { CloseProjectResponse } from '../../../../src/shared/ipc-project.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { clearActiveProject } from '../../../ipc-runtime.js'

export async function handleCloseProject(): Promise<IpcEnvelope<CloseProjectResponse>> {
  try {
    await clearActiveProject()
    return { ok: true, data: { closed: true } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to close project'
    return errorEnvelope('PROJECT_CLOSE_FAILED', message)
  }
}
