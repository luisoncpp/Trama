/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { DocumentRepository } from '../electron/services/document-repository'

describe('document repository map create', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('creates a map markdown file and copies the selected image into res', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-map-create-repo-'))
    const repository = new DocumentRepository()
    const sourceImagePath = path.join(tempRoot, 'fixtures', 'world-map.png')

    await mkdir(path.dirname(sourceImagePath), { recursive: true })
    await writeFile(sourceImagePath, 'fake-png-bytes', 'utf8')

    const result = await repository.createMapDocument(
      tempRoot,
      'lore/maps/realm-map.md',
      'Realm Map',
      sourceImagePath,
    )

    expect(result.path).toBe('lore/maps/realm-map.md')
    expect(result.imagePath).toBe('res/realm-map.png')

    await expect(readFile(path.join(tempRoot, result.imagePath), 'utf8')).resolves.toBe('fake-png-bytes')

    const markdown = await readFile(path.join(tempRoot, result.path), 'utf8')
    expect(markdown).toContain('type: map')
    expect(markdown).toContain('name: Realm Map')
    expect(markdown).toContain('backgroundImage: res/realm-map.png')
    expect(markdown).toContain('markers: []')
  })

  it('adds a numeric suffix when the copied image name already exists in res', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-map-create-repo-'))
    const repository = new DocumentRepository()
    const sourceImagePath = path.join(tempRoot, 'fixtures', 'world-map.png')

    await mkdir(path.join(tempRoot, 'res'), { recursive: true })
    await mkdir(path.dirname(sourceImagePath), { recursive: true })
    await writeFile(path.join(tempRoot, 'res', 'realm-map.png'), 'existing-image', 'utf8')
    await writeFile(sourceImagePath, 'fresh-image', 'utf8')

    const result = await repository.createMapDocument(
      tempRoot,
      'lore/maps/realm-map.md',
      'Realm Map',
      sourceImagePath,
    )

    expect(result.imagePath).toBe('res/realm-map-1.png')
    await expect(readFile(path.join(tempRoot, result.imagePath), 'utf8')).resolves.toBe('fresh-image')
  })
})
