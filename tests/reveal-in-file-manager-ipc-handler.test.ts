/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { openPathMock, showItemInFolderMock } = vi.hoisted(() => ({
  openPathMock: vi.fn(),
  showItemInFolderMock: vi.fn(),
}))

vi.mock('electron', () => ({
  shell: {
    openPath: openPathMock,
    showItemInFolder: showItemInFolderMock,
  },
}))

vi.mock('../electron/ipc-runtime', () => ({
  getActiveProjectRoot: vi.fn(),
}))

import { getActiveProjectRoot } from '../electron/ipc-runtime'
import { handleRevealInFileManager } from '../electron/ipc/handlers/project-handlers/project-reveal-handler'

describe('reveal in file manager ipc handler', () => {
  let tempRoot: string | null = null

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-reveal-'))
    vi.mocked(getActiveProjectRoot).mockReturnValue(tempRoot)
  })

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true })
      tempRoot = null
    }
    openPathMock.mockReset()
    showItemInFolderMock.mockReset()
    vi.clearAllMocks()
  })

  it('reveals project root folder itself using openPath', async () => {
    const rootPath = path.resolve(tempRoot!)
    openPathMock.mockResolvedValueOnce('')

    const response = await handleRevealInFileManager({ path: rootPath })

    expect(response.ok).toBe(true)
    expect(openPathMock).toHaveBeenCalledWith(rootPath)
    expect(showItemInFolderMock).not.toHaveBeenCalled()
  })

  it('reveals a subfile using showItemInFolder', async () => {
    const filePath = path.join(tempRoot!, 'book', 'scene.md')
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, '# Scene', 'utf8')

    const response = await handleRevealInFileManager({ path: filePath })

    expect(response.ok).toBe(true)
    expect(showItemInFolderMock).toHaveBeenCalledWith(filePath)
    expect(openPathMock).not.toHaveBeenCalled()
  })

  it('rejects path that escapes the project root', async () => {
    const outsidePath = path.resolve(tempRoot!, '..', 'unauthorized.md')

    const response = await handleRevealInFileManager({ path: outsidePath })

    expect(response.ok).toBe(false)
    if (response.ok) return
    expect(response.error.message).toContain('escapes project root')
    expect(openPathMock).not.toHaveBeenCalled()
    expect(showItemInFolderMock).not.toHaveBeenCalled()
  })

  it('rejects non-existent paths', async () => {
    const nonExistentPath = path.join(tempRoot!, 'book', 'missing-file.md')

    const response = await handleRevealInFileManager({ path: nonExistentPath })

    expect(response.ok).toBe(false)
    if (response.ok) return
    expect(response.error.message).toContain('does not exist')
    expect(openPathMock).not.toHaveBeenCalled()
    expect(showItemInFolderMock).not.toHaveBeenCalled()
  })
})
