import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { IndexService } from '../electron/services/index-service'
import { handleReorderFiles } from '../electron/ipc/handlers/project-handlers/order-handlers'

vi.mock('../electron/ipc-runtime', () => ({
  getActiveIndexService: vi.fn(),
  getActiveProjectRoot: vi.fn(),
  getActiveTagIndexService: vi.fn(),
  markInternalWrite: vi.fn(),
}))

vi.mock('../electron/services/project-scanner', () => ({
  scanProject: vi.fn(),
}))

vi.mock('../electron/ipc/handlers/project-handlers/shared', async () => {
  const original = await vi.importActual('../electron/ipc/handlers/project-handlers/shared')
  return {
    ...original,
    readMetaByPath: vi.fn(),
  }
})

import { getActiveIndexService } from '../electron/ipc-runtime'

describe('corkboardOrder persistence regressions', () => {
  let projectRoot: string
  let indexService: IndexService

  beforeEach(async () => {
    projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-corkboard-'))
    indexService = new IndexService(projectRoot)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handleReorderFiles writes project-relative folderPath to index', async () => {
    vi.mocked(getActiveIndexService).mockReturnValue(indexService)

    const payload = {
      folderPath: 'book/Act-01',
      orderedIds: ['book/Act-01/scene-b.md', 'book/Act-01/scene-a.md'],
    }

    const result = await handleReorderFiles(payload)

    expect(result.ok).toBe(true)

    const persisted = JSON.parse(await readFile(path.join(projectRoot, '.trama.index.json'), 'utf8'))
    expect(persisted.corkboardOrder['book/Act-01']).toEqual(['book/Act-01/scene-b.md', 'book/Act-01/scene-a.md'])
  })

  it('handleReorderFiles accepts section-root empty string folderPath', async () => {
    vi.mocked(getActiveIndexService).mockReturnValue(indexService)

    const payload = {
      folderPath: '',
      orderedIds: ['book/scene-b.md', 'book/scene-a.md'],
    }

    const result = await handleReorderFiles(payload)

    expect(result.ok).toBe(true)

    const persisted = JSON.parse(await readFile(path.join(projectRoot, '.trama.index.json'), 'utf8'))
    expect(persisted.corkboardOrder['']).toEqual(['book/scene-b.md', 'book/scene-a.md'])
  })

  it('handleReorderFiles preserves existing index entries when overwriting a folder', async () => {
    vi.mocked(getActiveIndexService).mockReturnValue(indexService)

    await writeFile(
      path.join(projectRoot, '.trama.index.json'),
      JSON.stringify({
        version: '1.0.0',
        corkboardOrder: {
          'outline': ['scene-1.md', 'scene-2.md'],
          'book': ['intro.md'],
        },
        cache: {},
      }),
      'utf8',
    )

    const payload = {
      folderPath: 'book',
      orderedIds: ['book/ch-01.md', 'book/intro.md'],
    }

    const result = await handleReorderFiles(payload)

    expect(result.ok).toBe(true)

    const persisted = JSON.parse(await readFile(path.join(projectRoot, '.trama.index.json'), 'utf8'))
    expect(persisted.corkboardOrder['book']).toEqual(['book/ch-01.md', 'book/intro.md'])
    expect(persisted.corkboardOrder['outline']).toEqual(['scene-1.md', 'scene-2.md'])
  })

  it('handleReorderFiles creates index file when none exists', async () => {
    vi.mocked(getActiveIndexService).mockReturnValue(indexService)

    const payload = {
      folderPath: 'outline',
      orderedIds: ['outline/scene-2.md', 'outline/scene-1.md'],
    }

    const result = await handleReorderFiles(payload)

    expect(result.ok).toBe(true)

    const indexPath = path.join(projectRoot, '.trama.index.json')
    const stat = await import('node:fs/promises').then((fs) => fs.stat(indexPath))
    expect(stat.isFile()).toBe(true)

    const persisted = JSON.parse(await readFile(indexPath, 'utf8'))
    expect(persisted.corkboardOrder['outline']).toEqual(['outline/scene-2.md', 'outline/scene-1.md'])
  })
})
