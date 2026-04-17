import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import type { DocumentMeta, ProjectIndex } from '../../src/shared/ipc.js'

const INDEX_FILE_NAME = '.trama.index.json'

function createDefaultIndex(): ProjectIndex {
  return {
    version: '1.0.0',
    corkboardOrder: {},
    cache: {},
  }
}

function folderFromPath(relativePath: string): string {
  const folder = path.posix.dirname(relativePath)
  return folder === '.' ? '' : folder
}

function idFromMeta(meta: DocumentMeta, filePath: string): string {
  if (typeof meta.id === 'string' && meta.id.trim()) {
    return meta.id
  }

  return filePath
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
  ): Promise<ProjectIndex> {
    const current = await this.loadIndex()
    const next: ProjectIndex = {
      version: current.version,
      corkboardOrder: {},
      cache: {},
    }

    const existingPaths = new Set(markdownFiles)
    for (const filePath of markdownFiles) {
      next.cache[filePath] = metaByPath[filePath] ?? current.cache[filePath] ?? {}
    }

    const idsByFolder = new Map<string, string[]>()
    for (const filePath of markdownFiles) {
      const folder = folderFromPath(filePath)
      const list = idsByFolder.get(folder) ?? []
      list.push(idFromMeta(next.cache[filePath], filePath))
      idsByFolder.set(folder, list)
    }

    for (const [folder, ids] of idsByFolder.entries()) {
      const available = new Set(ids)
      const previousOrder = current.corkboardOrder[folder] ?? []
      const kept = previousOrder.filter((id) => available.has(id))
      const missing = ids.filter((id) => !kept.includes(id))
      next.corkboardOrder[folder] = [...kept, ...missing]
    }

    for (const [cachedPath, cachedMeta] of Object.entries(current.cache)) {
      if (existingPaths.has(cachedPath) && next.cache[cachedPath] == null) {
        next.cache[cachedPath] = cachedMeta
      }
    }

    await this.saveIndex(next)
    return next
  }

  async updateFolderOrder(folderPath: string, orderedIds: string[]): Promise<void> {
    const index = await this.loadIndex()
    index.corkboardOrder[folderPath] = orderedIds
    await this.saveIndex(index)
  }
}
