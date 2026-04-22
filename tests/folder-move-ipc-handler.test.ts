/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setActiveProject } from '../electron/ipc-runtime'
import { IndexService } from '../electron/services/index-service'
import { handleMoveFolder } from '../electron/ipc/handlers/project-handlers/folder-handlers'
import * as ipcRuntime from '../electron/ipc-runtime'

describe('folder move ipc handler', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('returns VALIDATION_ERROR envelope for invalid payload', async () => {
    const response = await handleMoveFolder({ sourcePath: '', targetParent: '' })

    expect(response.ok).toBe(false)
    if (response.ok) {
      return
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
    expect(response.error.message).toContain('Invalid payload for folder move')
  })

  it('moves folder and returns success envelope', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-ipc-'))
    const oldFilePath = path.join(tempRoot, 'outline', 'Act-01', 'Scene-001.md')

    await mkdir(path.dirname(oldFilePath), { recursive: true })
    await mkdir(path.join(tempRoot, 'outline', 'Act-02'), { recursive: true })
    await writeFile(oldFilePath, '# Scene IPC', 'utf-8')

    setActiveProject(tempRoot, new IndexService(tempRoot))

    const response = await handleMoveFolder({ sourcePath: 'outline/Act-01', targetParent: 'outline/Act-02' })

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data.sourcePath).toBe('outline/Act-01')
    expect(response.data.renamedTo).toBe('outline/Act-02/Act-01')
    await expect(readFile(path.join(tempRoot, 'outline', 'Act-02', 'Act-01', 'Scene-001.md'), 'utf-8')).resolves.toContain('# Scene IPC')
  })

  it('marks old and new subtree markdown paths as internal writes', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-ipc-'))
    const firstFilePath = path.join(tempRoot, 'outline', 'Act-01', 'Scene-001.md')
    const secondFilePath = path.join(tempRoot, 'outline', 'Act-01', 'Scene-002.md')

    await mkdir(path.dirname(firstFilePath), { recursive: true })
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await writeFile(firstFilePath, '# Scene 001', 'utf-8')
    await writeFile(secondFilePath, '# Scene 002', 'utf-8')

    setActiveProject(tempRoot, new IndexService(tempRoot))
    const markInternalWriteSpy = vi.spyOn(ipcRuntime, 'markInternalWrite')

    const response = await handleMoveFolder({ sourcePath: 'outline/Act-01', targetParent: 'book' })

    expect(response.ok).toBe(true)
    expect(markInternalWriteSpy).toHaveBeenCalledWith('outline/Act-01/Scene-001.md')
    expect(markInternalWriteSpy).toHaveBeenCalledWith('outline/Act-01/Scene-002.md')
    expect(markInternalWriteSpy).toHaveBeenCalledWith('book/Act-01/Scene-001.md')
    expect(markInternalWriteSpy).toHaveBeenCalledWith('book/Act-01/Scene-002.md')

    markInternalWriteSpy.mockRestore()
  })

  it('returns error envelope when target already exists', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-ipc-'))

    await mkdir(path.join(tempRoot, 'outline', 'Act-01'), { recursive: true })
    await mkdir(path.join(tempRoot, 'outline', 'Act-02', 'Act-01'), { recursive: true })

    setActiveProject(tempRoot, new IndexService(tempRoot))

    const response = await handleMoveFolder({ sourcePath: 'outline/Act-01', targetParent: 'outline/Act-02' })

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('FOLDER_MOVE_FAILED')
    }
  })

  it('rejects move into itself', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-ipc-'))

    await mkdir(path.join(tempRoot, 'outline', 'Act-01', 'nested'), { recursive: true })

    setActiveProject(tempRoot, new IndexService(tempRoot))

    const response = await handleMoveFolder({ sourcePath: 'outline/Act-01', targetParent: 'outline/Act-01/nested' })

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('FOLDER_MOVE_FAILED')
    }
  })
})
