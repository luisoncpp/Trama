import { shell } from 'electron'
import type { IpcEnvelope } from '../../../../src/shared/ipc.js'
import {
  revealInFileManagerRequestSchema,
  type RevealInFileManagerResponse,
} from '../../../../src/shared/ipc-project.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { getActiveProjectRoot } from '../../../ipc-runtime.js'
import { stat } from 'node:fs/promises'
import path from 'node:path'

export async function handleRevealInFileManager(
  rawPayload: unknown,
): Promise<IpcEnvelope<RevealInFileManagerResponse>> {
  const payload = revealInFileManagerRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for reveal in file manager', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const targetPath = path.resolve(payload.data.path)

    const absoluteProjectRoot = path.resolve(projectRoot)
    const rootWithSeparator = `${absoluteProjectRoot}${path.sep}`

    if (targetPath !== absoluteProjectRoot && !targetPath.startsWith(rootWithSeparator)) {
      return errorEnvelope('REVEAL_PROJECT_FAILED', 'Path escapes project root')
    }

    try {
      const pathStat = await stat(targetPath)
      if (pathStat.isDirectory() && targetPath === absoluteProjectRoot) {
        const openError = await shell.openPath(targetPath)
        if (openError) {
          return errorEnvelope('REVEAL_PROJECT_FAILED', openError)
        }
      } else {
        shell.showItemInFolder(targetPath)
      }
    } catch (error) {
      return errorEnvelope('REVEAL_PROJECT_FAILED', `Path does not exist: ${targetPath}`)
    }

    return { ok: true, data: { path: targetPath } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to open path'
    return errorEnvelope('REVEAL_PROJECT_FAILED', message)
  }
}
