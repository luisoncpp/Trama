/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../electron/ipc-runtime', () => ({
  getActiveProjectRoot: vi.fn(),
}))

import { getActiveProjectRoot } from '../electron/ipc-runtime'
import { handleReadImageFile } from '../electron/ipc/handlers/image-handlers'

describe('image read ipc handler', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true })
      tempRoot = null
    }
    vi.clearAllMocks()
  })

  it('returns a data URL for a project image path', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-image-read-'))
    await mkdir(path.join(tempRoot, 'res'), { recursive: true })
    await writeFile(path.join(tempRoot, 'res', 'map.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8')
    vi.mocked(getActiveProjectRoot).mockReturnValue(tempRoot)

    const response = await handleReadImageFile({ path: 'res/map.svg' })

    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.data.mimeType).toBe('image/svg+xml')
    expect(response.data.dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
  })
})
