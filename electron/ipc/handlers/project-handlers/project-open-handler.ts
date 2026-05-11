import { openProjectRequestSchema, type IpcEnvelope, type ProjectSnapshot } from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import {
  setActiveProject,
  startWatcher,
} from '../../../ipc-runtime.js'
import { IndexService } from '../../../services/index-service.js'
import { scanProject } from '../../../services/project-scanner.js'
import { readMetaByPath, resolveProjectRoot } from './shared.js'

export async function handleOpenProject(rawPayload: unknown): Promise<IpcEnvelope<ProjectSnapshot>> {
  const payload = openProjectRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for project open', payload.error.flatten())
  }
  try {
    const projectRoot = await resolveProjectRoot(payload.data.rootPath)
    await startWatcher(projectRoot)
    const { tree, markdownFiles } = await scanProject(projectRoot)
    const metaByPath = await readMetaByPath(projectRoot, markdownFiles)

    const indexService = new IndexService(projectRoot)
    const index = await indexService.reconcileIndex(markdownFiles, metaByPath)

    setActiveProject(projectRoot, indexService, markdownFiles, metaByPath)

    return {
      ok: true,
      data: {
        rootPath: projectRoot,
        tree,
        markdownFiles : markdownFiles,
        index,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to open project'
    console.error(`Error opening project: ${message}`);
    return errorEnvelope('PROJECT_OPEN_FAILED', message)
  }
}
