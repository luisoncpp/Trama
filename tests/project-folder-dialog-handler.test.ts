/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { showOpenDialogMock, showMessageBoxMock } = vi.hoisted(() => ({
  showOpenDialogMock: vi.fn(),
  showMessageBoxMock: vi.fn(),
}))

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: showOpenDialogMock,
    showMessageBox: showMessageBoxMock,
  },
}))

import { handleSelectProjectFolder } from '../electron/ipc/handlers/project-handlers/project-folder-dialog-handler'

describe('project folder dialog handler', () => {
  const tempRoots: string[] = []

  afterEach(async () => {
    showOpenDialogMock.mockReset()
    showMessageBoxMock.mockReset()

    while (tempRoots.length > 0) {
      const root = tempRoots.pop()
      if (!root) {
        continue
      }

      await rm(root, { recursive: true, force: true })
    }
  })

  it('returns selected path when required folders already exist', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-picker-'))
    tempRoots.push(projectRoot)

    await Promise.all([
      mkdir(path.join(projectRoot, 'book'), { recursive: true }),
      mkdir(path.join(projectRoot, 'lore'), { recursive: true }),
      mkdir(path.join(projectRoot, 'outline'), { recursive: true }),
    ])

    showOpenDialogMock.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] })

    const response = await handleSelectProjectFolder()

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data.rootPath).toBe(projectRoot)
    expect(showMessageBoxMock).not.toHaveBeenCalled()
  })

  it('creates missing required folders when user accepts', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-picker-'))
    tempRoots.push(projectRoot)

    await mkdir(path.join(projectRoot, 'book'), { recursive: true })

    showOpenDialogMock.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] })
    showMessageBoxMock.mockResolvedValueOnce({ response: 0 })

    const response = await handleSelectProjectFolder()

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data.rootPath).toBe(projectRoot)
    await expect(access(path.join(projectRoot, 'lore'))).resolves.toBeUndefined()
    await expect(access(path.join(projectRoot, 'outline'))).resolves.toBeUndefined()
  })

  it('reopens folder selection when user declines creation', async () => {
    const firstProjectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-picker-'))
    const secondProjectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-picker-'))
    tempRoots.push(firstProjectRoot, secondProjectRoot)

    await Promise.all([
      mkdir(path.join(secondProjectRoot, 'book'), { recursive: true }),
      mkdir(path.join(secondProjectRoot, 'lore'), { recursive: true }),
      mkdir(path.join(secondProjectRoot, 'outline'), { recursive: true }),
    ])

    showOpenDialogMock
      .mockResolvedValueOnce({ canceled: false, filePaths: [firstProjectRoot] })
      .mockResolvedValueOnce({ canceled: false, filePaths: [secondProjectRoot] })
    showMessageBoxMock.mockResolvedValueOnce({ response: 1 })

    const response = await handleSelectProjectFolder()

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(showOpenDialogMock).toHaveBeenCalledTimes(2)
    expect(response.data.rootPath).toBe(secondProjectRoot)
  })
})
