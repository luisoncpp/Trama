import { stat } from 'node:fs/promises'
import path from 'node:path'
import { DocumentRepository } from '../../../services/document-repository.js'
import { getActiveIndexService, getActiveTagIndexService } from '../../../ipc-runtime.js'
import { scanProject } from '../../../services/project-scanner.js'

const documentRepository = new DocumentRepository()

export async function reconcileActiveProjectIndex(projectRoot: string): Promise<void> {
  const indexService = getActiveIndexService()
  const tagIndexService = getActiveTagIndexService()
  if (!indexService && !tagIndexService) {
    return
  }

  const { markdownFiles } = await scanProject(projectRoot)
  const metaByPath = await readMetaByPath(projectRoot, markdownFiles)
  if (indexService) {
    await indexService.reconcileIndex(markdownFiles, metaByPath)
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
