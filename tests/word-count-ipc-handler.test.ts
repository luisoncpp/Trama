import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { handleGetWordCounts } from '../electron/ipc/handlers/project-handlers/word-count-handler'

describe('handleGetWordCounts', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'trama-word-count-ipc-test-'))
    await mkdir(path.join(tempDir, 'book'), { recursive: true })
    await writeFile(path.join(tempDir, 'book', 'intro.md'), 'Welcome to the story.', 'utf8')
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('rejects invalid payloads with VALIDATION_ERROR', async () => {
    const result = await handleGetWordCounts({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('returns section word counts envelope for valid projectRoot', async () => {
    const result = await handleGetWordCounts({ projectRoot: tempDir })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.manuscript).toBe(4)
      expect(result.data.outline).toBe(0)
      expect(result.data.lore).toBe(0)
      expect(result.data.total).toBe(4)
    }
  })
})
