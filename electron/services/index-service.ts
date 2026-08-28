// @Architecture(descriptionShort="`.trama.index.json` load, save, reconcile, and cache updates")
import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import type { DocumentMeta, ProjectIndex } from '../../src/shared/ipc.js'
import {
  rebuildDocumentOrder,
  remapDocumentOrder,
  type DocumentOrderRemaps,
} from '../../src/shared/document-order/index.js'

const INDEX_FILE_NAME = '.trama.index.json'

function createDefaultIndex(): ProjectIndex {
  return {
    version: '1.0.0',
    corkboardOrder: {},
    cache: {},
  }
}

export class IndexService {
  private readonly indexPath: string

  constructor(private readonly projectRoot: string) {
    this.indexPath = path.join(projectRoot, INDEX_FILE_NAME)
  }

  async loadIndex(): Promise<ProjectIndex> {
    try {
      const raw = await readFile(this.indexPath, 'utf8')
      const parsed = JSON.parse(raw) as ProjectIndex

      return {
        version: typeof parsed.version === 'string' ? parsed.version : '1.0.0',
        corkboardOrder: parsed.corkboardOrder ?? {},
        cache: parsed.cache ?? {},
      }
    } catch {
      return createDefaultIndex()
    }
  }

  async saveIndex(index: ProjectIndex): Promise<void> {
    await writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf8')
  }

  async reconcileIndex(
    markdownFiles: string[],
    metaByPath: Record<string, DocumentMeta>,
    remaps?: DocumentOrderRemaps,
  ): Promise<ProjectIndex> {
    const current = await this.loadIndex()
    const previousOrderByFolder = remapDocumentOrder(current.corkboardOrder, remaps)
    const next: ProjectIndex = {
      version: current.version,
      corkboardOrder: {},
      cache: {},
    }

    const existingPaths = new Set(markdownFiles)
    for (const filePath of markdownFiles) {
      next.cache[filePath] = metaByPath[filePath] ?? current.cache[filePath] ?? {}
    }

    next.corkboardOrder = rebuildDocumentOrder(markdownFiles, next.cache, previousOrderByFolder)

    for (const [cachedPath, cachedMeta] of Object.entries(current.cache)) {
      if (existingPaths.has(cachedPath) && next.cache[cachedPath] == null) {
        next.cache[cachedPath] = cachedMeta
      }
    }

    await this.saveIndex(next)
    return next
  }

  async updateCache(
    changedFiles: string[],
    metaByPath: Record<string, DocumentMeta>,
  ): Promise<ProjectIndex> {
    const index = await this.loadIndex()

    for (const filePath of changedFiles) {
      const meta = metaByPath[filePath]
      if (meta) {
        index.cache[filePath] = meta
      } else {
        delete index.cache[filePath]
      }
    }

    await this.saveIndex(index)
    return index
  }
}

export async function persistFolderOrder(
  indexService: IndexService,
  folderPath: string,
  orderedIds: string[],
): Promise<void> {
  const index = await indexService.loadIndex()
  index.corkboardOrder[folderPath] = orderedIds
  await indexService.saveIndex(index)
}
