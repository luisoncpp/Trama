/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { handleAiImport } from '../electron/ipc/handlers/ai-handlers'

describe('ai import ipc handler', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('returns VALIDATION_ERROR envelope for invalid import mode', async () => {
    const response = await handleAiImport(
      {} as never,
      {
        clipboardContent: '=== FILE: book/one.md ===\n# One',
        projectRoot: 'C:/project',
        importMode: 'merge',
      },
    )

    expect(response.ok).toBe(false)
    if (response.ok) {
      return
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
    expect(response.error.message).toContain('Invalid payload for AI import')
  })

  it('returns success envelope and appends content in append mode', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-ai-import-ipc-'))
    const existingPath = path.join(tempRoot, 'book', 'scene.md')
    await mkdir(path.dirname(existingPath), { recursive: true })
    await writeFile(existingPath, '# Existing', 'utf-8')

    const response = await handleAiImport(
      {} as never,
      {
        clipboardContent: '=== FILE: book/scene.md ===\n## Imported block',
        projectRoot: tempRoot,
        importMode: 'append',
      },
    )

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data.appended).toEqual(['book/scene.md'])
    expect(response.data.replaced).toEqual([])
    await expect(readFile(existingPath, 'utf-8')).resolves.toBe('# Existing\n\n## Imported block')
  })
})