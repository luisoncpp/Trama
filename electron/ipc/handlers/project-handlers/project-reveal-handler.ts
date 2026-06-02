import { shell } from 'electron'
import type { IpcEnvelope } from '../../../../src/shared/ipc.js'
import {
  revealProjectInFileManagerRequestSchema,
  type RevealProjectInFileManagerResponse,
} from '../../../../src/shared/ipc-project.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { resolveProjectRoot } from './shared.js'

export async function handleRevealProjectInFileManager(
  rawPayload: unknown,
): Promise<IpcEnvelope<RevealProjectInFileManagerResponse>> {
  const payload = revealProjectInFileManagerRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for reveal in file manager', payload.error.flatten())
  }

  try {
    const projectRoot = await resolveProjectRoot(payload.data.rootPath)
    const openError = await shell.openPath(projectRoot)
    if (openError) {
      return errorEnvelope('REVEAL_PROJECT_FAILED', openError)
    }

    return { ok: true, data: { rootPath: projectRoot } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to open project folder'
    return errorEnvelope('REVEAL_PROJECT_FAILED', message)
  }
}
