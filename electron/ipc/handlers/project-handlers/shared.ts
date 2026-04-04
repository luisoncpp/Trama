import { stat } from 'node:fs/promises'
import path from 'node:path'
import { DocumentRepository } from '../../../services/document-repository.js'

const documentRepository = new DocumentRepository()

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
