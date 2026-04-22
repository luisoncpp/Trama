/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { DocumentRepository } from '../electron/services/document-repository'

describe('document repository folder move', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('moves folder into another parent folder', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-repo-'))
    const repository = new DocumentRepository()
    const oldFilePath = path.join(tempRoot, 'outline', 'Act-01', 'Scene-001.md')

    await mkdir(path.dirname(oldFilePath), { recursive: true })
    await mkdir(path.join(tempRoot, 'outline', 'Act-02'), { recursive: true })
    await writeFile(oldFilePath, '# Scene 001', 'utf-8')

    const result = await repository.moveFolder(tempRoot, 'outline/Act-01', 'outline/Act-02')

    expect(result.sourcePath).toBe('outline/Act-01')
    expect(result.renamedTo).toBe('outline/Act-02/Act-01')
    await expect(readFile(path.join(tempRoot, 'outline', 'Act-02', 'Act-01', 'Scene-001.md'), 'utf-8')).resolves.toContain('# Scene 001')
  })

  it('moves folder to section root (empty targetParent)', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-repo-'))
    const repository = new DocumentRepository()
    const oldFilePath = path.join(tempRoot, 'outline', 'nested', 'Act-01', 'Scene-001.md')

    await mkdir(path.dirname(oldFilePath), { recursive: true })
    await writeFile(oldFilePath, '# Scene 001', 'utf-8')

    const result = await repository.moveFolder(tempRoot, 'outline/nested/Act-01', '')

    expect(result.sourcePath).toBe('outline/nested/Act-01')
    expect(result.renamedTo).toBe('Act-01')
    await expect(readFile(path.join(tempRoot, 'Act-01', 'Scene-001.md'), 'utf-8')).resolves.toContain('# Scene 001')
  })

  it('rejects folder move when destination already exists', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-repo-'))
    const repository = new DocumentRepository()

    await mkdir(path.join(tempRoot, 'outline', 'Act-01'), { recursive: true })
    await mkdir(path.join(tempRoot, 'outline', 'Act-02', 'Act-01'), { recursive: true })

    await expect(repository.moveFolder(tempRoot, 'outline/Act-01', 'outline/Act-02')).rejects.toThrow('Path already exists')
  })

  it('rejects when source is not a folder', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-repo-'))
    const repository = new DocumentRepository()

    await mkdir(path.join(tempRoot, 'outline'), { recursive: true })
    await writeFile(path.join(tempRoot, 'outline', 'file.md'), '# File', 'utf-8')

    await expect(repository.moveFolder(tempRoot, 'outline/file.md', '')).rejects.toThrow('Source is not a folder')
  })

  it('rejects when source and target are the same', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-repo-'))
    const repository = new DocumentRepository()

    await mkdir(path.join(tempRoot, 'outline', 'Act-01'), { recursive: true })

    await expect(repository.moveFolder(tempRoot, 'outline/Act-01', 'outline')).rejects.toThrow('Source and target paths are the same')
  })

  it('rejects moving folder into itself', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-repo-'))
    const repository = new DocumentRepository()

    await mkdir(path.join(tempRoot, 'outline', 'Act-01', 'nested'), { recursive: true })

    await expect(repository.moveFolder(tempRoot, 'outline/Act-01', 'outline/Act-01/nested')).rejects.toThrow()
  })

  it('preserves multiple nested files after move', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-move-repo-'))
    const repository = new DocumentRepository()

    await mkdir(path.join(tempRoot, 'outline', 'Act-01', 'scenes'), { recursive: true })
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await writeFile(path.join(tempRoot, 'outline', 'Act-01', 'Scene-001.md'), '# Scene 1', 'utf-8')
    await writeFile(path.join(tempRoot, 'outline', 'Act-01', 'scenes', 'Scene-002.md'), '# Scene 2', 'utf-8')

    const result = await repository.moveFolder(tempRoot, 'outline/Act-01', 'book')

    expect(result.renamedTo).toBe('book/Act-01')
    await expect(readFile(path.join(tempRoot, 'book', 'Act-01', 'Scene-001.md'), 'utf-8')).resolves.toContain('# Scene 1')
    await expect(readFile(path.join(tempRoot, 'book', 'Act-01', 'scenes', 'Scene-002.md'), 'utf-8')).resolves.toContain('# Scene 2')
  })
})
