/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { DocumentRepository } from '../electron/services/document-repository'

describe('document repository folder rename', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('renames folder and keeps nested markdown files', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-rename-repo-'))
    const repository = new DocumentRepository()
    const oldFilePath = path.join(tempRoot, 'book', 'Act-01', 'Scene-001.md')

    await mkdir(path.dirname(oldFilePath), { recursive: true })
    await writeFile(oldFilePath, '# Scene 001', 'utf-8')

    const result = await repository.renameFolder(tempRoot, 'book/Act-01', 'Act-02')

    expect(result.path).toBe('book/Act-01')
    expect(result.renamedTo).toBe('book/Act-02')
    await expect(readFile(path.join(tempRoot, 'book', 'Act-02', 'Scene-001.md'), 'utf-8')).resolves.toContain('# Scene 001')
  })

  it('rejects folder rename when destination already exists', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-rename-repo-'))
    const repository = new DocumentRepository()

    await mkdir(path.join(tempRoot, 'book', 'Act-01'), { recursive: true })
    await mkdir(path.join(tempRoot, 'book', 'Act-02'), { recursive: true })

    await expect(repository.renameFolder(tempRoot, 'book/Act-01', 'Act-02')).rejects.toThrow('Path already exists')
  })

  it('rejects invalid folder name segments', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-rename-repo-'))
    const repository = new DocumentRepository()

    await mkdir(path.join(tempRoot, 'book', 'Act-01'), { recursive: true })

    await expect(repository.renameFolder(tempRoot, 'book/Act-01', 'Act/03')).rejects.toThrow('Name cannot contain path separators')
  })
})
