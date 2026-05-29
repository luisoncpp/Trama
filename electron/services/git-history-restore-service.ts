import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { collectLinkedImagePaths } from './document-image-persistence.js'
import { parseMarkdownWithFrontmatter } from './frontmatter.js'
import { getProjectCache, setProjectCache } from './project-state-cache.js'
import { getActiveTagIndexService, markInternalWrite } from '../ipc-runtime.js'
import type { DocumentMeta } from '../../src/shared/ipc.js'

function resolveProjectTarget(projectRoot: string, relativePath: string): string {
  const absoluteProjectRoot = path.resolve(projectRoot)
  const absoluteTarget = path.resolve(projectRoot, relativePath)
  const prefix = `${absoluteProjectRoot}${path.sep}`
  if (absoluteTarget !== absoluteProjectRoot && !absoluteTarget.startsWith(prefix)) {
    throw new Error('Path escapes project root')
  }
  return absoluteTarget
}

export async function writeHistoricalDocument(projectRoot: string, relativePath: string, content: Buffer): Promise<DocumentMeta> {
  const targetPath = resolveProjectTarget(projectRoot, relativePath)
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content)
  markInternalWrite(relativePath)
  return parseMarkdownWithFrontmatter(content.toString('utf8')).meta
}

export async function restoreHistoricalImages(
  projectRoot: string,
  markdown: string,
  readImage: (relativePath: string) => Promise<Buffer | null>,
): Promise<string[]> {
  const restoredPaths: string[] = []
  for (const imagePath of collectLinkedImagePaths(markdown)) {
    const imageBytes = await readImage(imagePath)
    if (!imageBytes) {
      continue
    }
    const targetPath = resolveProjectTarget(projectRoot, imagePath)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await writeFile(targetPath, imageBytes)
    markInternalWrite(imagePath)
    restoredPaths.push(imagePath)
  }
  return restoredPaths
}

export async function syncRestoredDocumentCache(projectRoot: string, relativePath: string, meta: DocumentMeta): Promise<void> {
  const cache = getProjectCache(projectRoot)
  if (cache) {
    const nextMetaByPath = { ...cache.metaByPath, [relativePath]: meta }
    setProjectCache(projectRoot, cache.tree, cache.markdownFiles, nextMetaByPath)
    await getActiveTagIndexService()?.buildIndex(cache.markdownFiles, nextMetaByPath)
  }
}
