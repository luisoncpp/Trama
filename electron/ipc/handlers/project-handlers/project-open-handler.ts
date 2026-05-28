import { type IpcEnvelope, type ProjectSnapshot } from '../../../../src/shared/ipc.js'
import { openProjectRequestSchema } from '../../../../src/shared/ipc-project.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import {
  setActiveProject,
  startWatcher,
} from '../../../ipc-runtime.js'
import { IndexService } from '../../../services/index-service.js'
import { scanProject } from '../../../services/project-scanner.js'
import { getProjectCache, setProjectCache } from '../../../services/project-state-cache.js'
import { applyIncrementalUpdate } from '../../../services/incremental-project-updater.js'
import { readMetaByPath, resolveProjectRoot } from './shared.js'

export async function handleOpenProject(rawPayload: unknown): Promise<IpcEnvelope<ProjectSnapshot>> {
  const payload = openProjectRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for project open', payload.error.flatten())
  }
  try {
    const projectRoot = await resolveProjectRoot(payload.data.rootPath)
    await startWatcher(projectRoot)

    let tree: ProjectSnapshot['tree']
    let markdownFiles: string[]
    let metaByPath: Record<string, Record<string, unknown>>

    const cache = getProjectCache(projectRoot)
    if (payload.data.incrementalUpdate && cache) {
      const updated = await applyIncrementalUpdate(cache, payload.data.incrementalUpdate, projectRoot)
      tree = updated.tree
      markdownFiles = updated.markdownFiles
      metaByPath = updated.metaByPath
      setProjectCache(projectRoot, tree, markdownFiles, metaByPath)
    } else {
      const scanResult = await scanProject(projectRoot)
      tree = scanResult.tree
      markdownFiles = scanResult.markdownFiles
      metaByPath = await readMetaByPath(projectRoot, markdownFiles)
      setProjectCache(projectRoot, tree, markdownFiles, metaByPath)
    }

    const indexService = new IndexService(projectRoot)
    const index = await indexService.reconcileIndex(markdownFiles, metaByPath)

    setActiveProject(projectRoot, indexService, markdownFiles, metaByPath)

    return {
      ok: true,
      data: {
        rootPath: projectRoot,
        tree,
        markdownFiles: markdownFiles,
        index,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to open project'
    console.error(`Error opening project: ${message}`);
    return errorEnvelope('PROJECT_OPEN_FAILED', message)
  }
}
