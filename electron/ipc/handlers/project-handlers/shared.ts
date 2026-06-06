import { stat } from 'node:fs/promises'
import path from 'node:path'
import { DocumentRepository } from '../../../services/document-repository.js'
import { getActiveIndexService, getActiveTagIndexService } from '../../../ipc-runtime.js'
import { scanProject } from '../../../services/project-scanner.js'
import { getProjectCache, setProjectCache } from '../../../services/project-state-cache.js'
import { isRelevantPath } from '../../../../src/shared/project-sections/index.js'

const documentRepository = new DocumentRepository()

export async function reconcileActiveProjectIndex(
  projectRoot: string,
  options?: { changedFiles?: string[] },
): Promise<void> {
  const indexService = getActiveIndexService()
  const tagIndexService = getActiveTagIndexService()
  if (!indexService && !tagIndexService) {
    return
  }

  let markdownFiles: string[]
  let metaByPath: Record<string, Record<string, unknown>>

  const cache = getProjectCache(projectRoot)
  if (options?.changedFiles && cache) {
    metaByPath = { ...cache.metaByPath }
    for (const filePath of options.changedFiles) {
      try {
        const doc = await documentRepository.readDocument(projectRoot, filePath)
        metaByPath[filePath] = doc.meta
      } catch {
        delete metaByPath[filePath]
      }
    }
    markdownFiles = cache.markdownFiles
    setProjectCache(projectRoot, cache.tree, markdownFiles, metaByPath)
  } else {
    const scanResult = await scanProject(projectRoot)
    markdownFiles = scanResult.markdownFiles
    metaByPath = await readMetaByPath(projectRoot, markdownFiles)
    setProjectCache(projectRoot, scanResult.tree, markdownFiles, metaByPath)
  }

  if (indexService) {
    if (options?.changedFiles) {
      await indexService.updateCache(options.changedFiles, metaByPath)
    } else {
      await indexService.reconcileIndex(markdownFiles, metaByPath)
    }
  }
  if (tagIndexService) {
    await tagIndexService.buildIndex(markdownFiles, metaByPath)
  }
}

export async function resolveProjectRoot(rootPath: string): Promise<string> {
  const absolute = path.resolve(rootPath)
  const info = await stat(absolute)

  if (!info.isDirectory()) {
    throw new Error('Selected path is not a directory')
  }

  return absolute
}

export async function readMetaByPath(
  projectRoot: string,
  markdownFiles: string[],
): Promise<Record<string, Record<string, unknown>>> {
  const metaByPath: Record<string, Record<string, unknown>> = {}

  for (const filePath of markdownFiles) {
    const document = await documentRepository.readDocument(projectRoot, filePath)
    metaByPath[filePath] = document.meta
  }

  return metaByPath
}

export { documentRepository }
