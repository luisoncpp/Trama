/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setActiveProject } from '../electron/ipc-runtime'
import { IndexService } from '../electron/services/index-service'
import { handleDeleteFolder } from '../electron/ipc/handlers/project-handlers/folder-handlers'
import * as ipcRuntime from '../electron/ipc-runtime'

describe('folder delete ipc handler', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('returns VALIDATION_ERROR envelope for invalid payload', async () => {
    const response = await handleDeleteFolder({ path: '' })

    expect(response.ok).toBe(false)
    if (response.ok) {
      return
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
    expect(response.error.message).toContain('Invalid payload for folder delete')
  })

  it('deletes folder recursively and returns success envelope', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-delete-ipc-'))
    const nestedFilePath = path.join(tempRoot, 'book', 'Act-01', 'Scene-001.md')

    await mkdir(path.dirname(nestedFilePath), { recursive: true })
    await writeFile(nestedFilePath, '# Scene IPC Delete', 'utf-8')

    setActiveProject(tempRoot, new IndexService(tempRoot))

    const response = await handleDeleteFolder({ path: 'book/Act-01' })

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data.path).toBe('book/Act-01')
    await expect(readFile(nestedFilePath, 'utf-8')).rejects.toThrow()
  })

  it('marks deleted subtree markdown paths as internal writes', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-delete-ipc-'))
    const firstFilePath = path.join(tempRoot, 'book', 'Act-01', 'Scene-001.md')
    const secondFilePath = path.join(tempRoot, 'book', 'Act-01', 'Scene-002.md')

    await mkdir(path.dirname(firstFilePath), { recursive: true })
    await writeFile(firstFilePath, '# Scene 001', 'utf-8')
    await writeFile(secondFilePath, '# Scene 002', 'utf-8')

    setActiveProject(tempRoot, new IndexService(tempRoot))
    const markInternalWriteSpy = vi.spyOn(ipcRuntime, 'markInternalWrite')

    const response = await handleDeleteFolder({ path: 'book/Act-01' })

    expect(response.ok).toBe(true)
    expect(markInternalWriteSpy).toHaveBeenCalledWith('book/Act-01/Scene-001.md')
    expect(markInternalWriteSpy).toHaveBeenCalledWith('book/Act-01/Scene-002.md')

    markInternalWriteSpy.mockRestore()
  })
})
