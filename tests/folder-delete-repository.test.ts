/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { DocumentRepository } from '../electron/services/document-repository'

describe('document repository folder delete', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('deletes folder recursively with nested markdown files', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-delete-repo-'))
    const repository = new DocumentRepository()
    const nestedFilePath = path.join(tempRoot, 'book', 'Act-01', 'Scene-001.md')

    await mkdir(path.dirname(nestedFilePath), { recursive: true })
    await writeFile(nestedFilePath, '# Scene 001', 'utf-8')

    const result = await repository.deleteFolder(tempRoot, 'book/Act-01')

    expect(result.path).toBe('book/Act-01')
    await expect(readFile(nestedFilePath, 'utf-8')).rejects.toThrow()
  })

  it('rejects deleting a file path as folder', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-delete-repo-'))
    const repository = new DocumentRepository()
    const filePath = path.join(tempRoot, 'book', 'Scene-001.md')

    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, '# Scene 001', 'utf-8')

    await expect(repository.deleteFolder(tempRoot, 'book/Scene-001.md')).rejects.toThrow('Only folders can be deleted')
  })
})
