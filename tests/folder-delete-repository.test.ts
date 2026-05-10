/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { DocumentRepository } from '../electron/services/document-repository'

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwDwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

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

  it('saves embedded images as project res png files and rewrites markdown', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-delete-repo-'))
    const repository = new DocumentRepository()
    const documentPath = 'book/Act-01/Scene-001.md'
    const absoluteDocumentPath = path.join(tempRoot, 'book', 'Act-01', 'Scene-001.md')

    await mkdir(path.dirname(absoluteDocumentPath), { recursive: true })
    await writeFile(absoluteDocumentPath, '# Scene\n', 'utf-8')

    const saveResult = await repository.saveDocument(
      tempRoot,
      documentPath,
      `Texto\n\n![img_0](${TINY_PNG})\n`,
      {},
    )

    expect(saveResult.affectedImagePaths).toContain('res/book_act_01_scene_001_0.png')

    const savedMarkdown = await readFile(absoluteDocumentPath, 'utf-8')
    expect(savedMarkdown).toContain('![img_0](res/book_act_01_scene_001_0.png)')
    expect(savedMarkdown).not.toContain('data:image/png')

    const readResult = await repository.readDocument(tempRoot, documentPath)
    expect(readResult.linkedImagePaths).toEqual(['res/book_act_01_scene_001_0.png'])
    expect(readResult.content).toContain('![img_0](data:image/png;base64,')
  })

  it('deletes linked image files when requested during document delete', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-folder-delete-repo-'))
    const repository = new DocumentRepository()
    const imagePath = path.join(tempRoot, 'res', 'book_act_01_scene_001_0.png')
    const documentPath = path.join(tempRoot, 'book', 'Act-01', 'Scene-001.md')

    await mkdir(path.dirname(imagePath), { recursive: true })
    await mkdir(path.dirname(documentPath), { recursive: true })
    await writeFile(imagePath, Buffer.from(TINY_PNG.split(',')[1] ?? '', 'base64'))
    await writeFile(documentPath, '![img_0](res/book_act_01_scene_001_0.png)', 'utf-8')

    const result = await repository.deleteDocument(tempRoot, 'book/Act-01/Scene-001.md', {
      deleteAssociatedImages: true,
    })

    expect(result.deletedImagePaths).toEqual(['res/book_act_01_scene_001_0.png'])
    await expect(readFile(imagePath)).rejects.toThrow()
  })
})
