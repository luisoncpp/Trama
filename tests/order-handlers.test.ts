import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { IndexService } from '../electron/services/index-service'
import { handleReorderFiles } from '../electron/ipc/handlers/project-handlers/order-handlers'

vi.mock('../electron/ipc-runtime', () => ({
  getActiveIndexService: vi.fn(),
}))

import { getActiveIndexService } from '../electron/ipc-runtime'

describe('order-handlers', () => {
  const { getActiveIndexService: originalGetIndexService } = vi.mocked({
    getActiveIndexService: vi.fn(),
  })

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

      const payload = { folderPath: 123, orderedIds: 'not-an-array' }

      const result = await handleReorderFiles(payload)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR')
      }
    })
  })
})
