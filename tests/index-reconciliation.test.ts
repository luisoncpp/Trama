import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { IndexService } from '../electron/services/index-service'

describe('index reconciliation', () => {
  it('keeps existing order, removes missing entries, and appends new files', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-index-'))
    const indexPath = path.join(projectRoot, '.trama.index.json')

    await writeFile(
      indexPath,
      JSON.stringify(
        {
          version: '1.0.0',
          corkboardOrder: {
            '': ['scene-b', 'scene-a', 'deleted-scene'],
          },
          cache: {
            '01_a.md': { id: 'scene-a', name: 'A' },
            '02_b.md': { id: 'scene-b', name: 'B' },
            '99_deleted.md': { id: 'deleted-scene', name: 'Old' },
          },
        },
        null,
        2,
      ),
      'utf8',
    )

    const service = new IndexService(projectRoot)

    const next = await service.reconcileIndex(
      ['01_a.md', '02_b.md', '03_c.md'],
      {
        '01_a.md': { id: 'scene-a', name: 'A' },
        '02_b.md': { id: 'scene-b', name: 'B' },
        '03_c.md': { id: 'scene-c', name: 'C' },
      },
    )

    expect(next.corkboardOrder['']).toEqual(['scene-b', 'scene-a', 'scene-c'])
    expect(Object.keys(next.cache)).toEqual(['01_a.md', '02_b.md', '03_c.md'])

    const persisted = JSON.parse(await readFile(indexPath, 'utf8')) as typeof next
    expect(persisted.corkboardOrder['']).toEqual(['scene-b', 'scene-a', 'scene-c'])
  })
})
