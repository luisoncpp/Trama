import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { IndexService } from '../electron/services/index-service'
import { handleReorderFiles, handleMoveFile } from '../electron/ipc/handlers/project-handlers/order-handlers'

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

import { getActiveIndexService, getActiveProjectRoot, getActiveTagIndexService, markInternalWrite } from '../electron/ipc-runtime'
import { scanProject } from '../electron/services/project-scanner'
import { readMetaByPath } from '../electron/ipc/handlers/project-handlers/shared'

describe('order-handlers', () => {
  describe('handleReorderFiles', () => {
    let projectRoot: string
    let indexService: IndexService

    beforeEach(async () => {
      projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-order-'))
      indexService = new IndexService(projectRoot)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('saves new order to index', async () => {
      vi.mocked(getActiveIndexService).mockReturnValue(indexService)

      const payload = {
        folderPath: 'outline',
        orderedIds: ['scene-2', 'scene-1', 'scene-3'],
      }

      const result = await handleReorderFiles(payload)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual({
          folderPath: 'outline',
          orderedIds: ['scene-2', 'scene-1', 'scene-3'],
        })
      }

      const persisted = JSON.parse(await readFile(path.join(projectRoot, '.trama.index.json'), 'utf8'))
      expect(persisted.corkboardOrder['outline']).toEqual(['scene-2', 'scene-1', 'scene-3'])
    })

    it('handles empty folder path (section root)', async () => {
      vi.mocked(getActiveIndexService).mockReturnValue(indexService)

      const payload = {
        folderPath: '',
        orderedIds: ['scene-b', 'scene-a'],
      }

      const result = await handleReorderFiles(payload)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.folderPath).toBe('')
      }

      const persisted = JSON.parse(await readFile(path.join(projectRoot, '.trama.index.json'), 'utf8'))
      expect(persisted.corkboardOrder['']).toEqual(['scene-b', 'scene-a'])
    })

    it('rejects when no active project', async () => {
      vi.mocked(getActiveIndexService).mockReturnValue(null)

      const payload = {
        folderPath: 'outline',
        orderedIds: ['scene-1'],
      }

      const result = await handleReorderFiles(payload)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('NO_ACTIVE_PROJECT')
      }
    })

    it('rejects invalid payload', async () => {
      vi.mocked(getActiveIndexService).mockReturnValue(indexService)

      const payload = { folderPath: 123, orderedIds: 'not-an-array' } as any

      const result = await handleReorderFiles(payload)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('handleMoveFile', () => {
    let projectRoot: string

    beforeEach(async () => {
      projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-move-'))
    })

    afterEach(async () => {
      vi.restoreAllMocks()
    })

    it('moves file and returns correct paths', async () => {
      vi.mocked(getActiveProjectRoot).mockReturnValue(projectRoot)
      vi.mocked(getActiveIndexService).mockReturnValue(null)
      vi.mocked(getActiveTagIndexService).mockReturnValue(null)
      vi.mocked(scanProject).mockResolvedValue({ markdownFiles: [], tree: [] })
      vi.mocked(readMetaByPath).mockResolvedValue({})
      vi.mocked(markInternalWrite).mockImplementation(() => {})

      const outlineDir = path.join(projectRoot, 'outline')
      const loreDir = path.join(projectRoot, 'lore/characters')
      await mkdir(outlineDir, { recursive: true })
      await mkdir(loreDir, { recursive: true })
      await writeFile(path.join(outlineDir, 'scene-1.md'), '---\nid: scene-1\n---\n# Scene 1\n', 'utf8')

      const payload = {
        sourcePath: 'outline/scene-1.md',
        targetFolder: 'lore/characters',
      }

      const result = await handleMoveFile(payload)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.path).toBe('outline/scene-1.md')
        expect(result.data.renamedTo).toBe('lore/characters/scene-1.md')
      }
    })

    it('rejects target collision (file exists)', async () => {
      vi.mocked(getActiveProjectRoot).mockReturnValue(projectRoot)
      vi.mocked(getActiveIndexService).mockReturnValue(null)
      vi.mocked(getActiveTagIndexService).mockReturnValue(null)
      vi.mocked(scanProject).mockResolvedValue({ markdownFiles: [], tree: [] })
      vi.mocked(readMetaByPath).mockResolvedValue({})
      vi.mocked(markInternalWrite).mockImplementation(() => {})

      const outlineDir = path.join(projectRoot, 'outline')
      const loreDir = path.join(projectRoot, 'lore/characters')
      await mkdir(outlineDir, { recursive: true })
      await mkdir(loreDir, { recursive: true })
      await writeFile(path.join(outlineDir, 'scene-1.md'), '---\nid: scene-1\n---\n# Scene 1\n', 'utf8')
      await writeFile(path.join(loreDir, 'scene-1.md'), '---\nid: scene-1-dup\n---\n# Duplicate\n', 'utf8')

      const payload = {
        sourcePath: 'outline/scene-1.md',
        targetFolder: 'lore/characters',
      }

      const result = await handleMoveFile(payload)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('MOVE_FILE_FAILED')
      }
    })

    it('rejects non-.md files', async () => {
      vi.mocked(getActiveProjectRoot).mockReturnValue(projectRoot)
      vi.mocked(getActiveIndexService).mockReturnValue(null)
      vi.mocked(getActiveTagIndexService).mockReturnValue(null)
      vi.mocked(scanProject).mockResolvedValue({ markdownFiles: [], tree: [] })
      vi.mocked(readMetaByPath).mockResolvedValue({})
      vi.mocked(markInternalWrite).mockImplementation(() => {})

      const outlineDir = path.join(projectRoot, 'outline')
      await mkdir(outlineDir, { recursive: true })
      await writeFile(path.join(outlineDir, 'data.json'), '{}', 'utf8')

      const payload = {
        sourcePath: 'outline/data.json',
        targetFolder: 'lore',
      }

      const result = await handleMoveFile(payload)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('MOVE_FILE_FAILED')
      }
    })

    it('rejects source file not found', async () => {
      vi.mocked(getActiveProjectRoot).mockReturnValue(projectRoot)
      vi.mocked(getActiveIndexService).mockReturnValue(null)
      vi.mocked(getActiveTagIndexService).mockReturnValue(null)
      vi.mocked(scanProject).mockResolvedValue({ markdownFiles: [], tree: [] })
      vi.mocked(readMetaByPath).mockResolvedValue({})
      vi.mocked(markInternalWrite).mockImplementation(() => {})

      const payload = {
        sourcePath: 'outline/nonexistent.md',
        targetFolder: 'lore',
      }

      const result = await handleMoveFile(payload)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('MOVE_FILE_FAILED')
      }
    })

    it('moves file to section root (empty targetFolder)', async () => {
      vi.mocked(getActiveProjectRoot).mockReturnValue(projectRoot)
      vi.mocked(getActiveIndexService).mockReturnValue(null)
      vi.mocked(getActiveTagIndexService).mockReturnValue(null)
      vi.mocked(scanProject).mockResolvedValue({ markdownFiles: [], tree: [] })
      vi.mocked(readMetaByPath).mockResolvedValue({})
      vi.mocked(markInternalWrite).mockImplementation(() => {})

      const outlineDir = path.join(projectRoot, 'outline')
      await mkdir(outlineDir, { recursive: true })
      await writeFile(path.join(outlineDir, 'scene-1.md'), '---\nid: scene-1\n---\n# Scene 1\n', 'utf8')

      const payload = {
        sourcePath: 'outline/scene-1.md',
        targetFolder: '',
      }

      const result = await handleMoveFile(payload)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.renamedTo).toBe('scene-1.md')
      }
    })
  })
})
