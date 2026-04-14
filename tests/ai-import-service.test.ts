/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { executeImport, previewImport } from '../electron/services/ai-import-service'

describe('ai import service', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('replaces existing file content in replace mode', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-ai-import-'))
    const filePath = path.join(tempRoot, 'book', 'scene.md')
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, 'Old content', 'utf-8')

    const result = await executeImport([
      { path: 'book/scene.md', content: 'New imported content' },
    ], tempRoot, 'replace')

    expect(result.created).toEqual([])
    expect(result.replaced).toEqual(['book/scene.md'])
    expect(result.appended).toEqual([])
    expect(result.errors).toEqual([])
    await expect(readFile(filePath, 'utf-8')).resolves.toBe('New imported content')
  })

  it('appends imported content to existing files in append mode', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-ai-import-'))
    const filePath = path.join(tempRoot, 'lore', 'place.md')
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, '# Existing place', 'utf-8')

    const result = await executeImport([
      { path: 'lore/place.md', content: '## Imported appendix' },
    ], tempRoot, 'append')

    expect(result.created).toEqual([])
    expect(result.replaced).toEqual([])
    expect(result.appended).toEqual(['lore/place.md'])
    expect(result.errors).toEqual([])
    await expect(readFile(filePath, 'utf-8')).resolves.toBe('# Existing place\n\n## Imported appendix')
  })

  it('reports new and existing files during preview', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-ai-import-'))
    const existingPath = path.join(tempRoot, 'outline', 'arc.md')
    await mkdir(path.dirname(existingPath), { recursive: true })
    await writeFile(existingPath, '# Arc', 'utf-8')

    const preview = await previewImport([
      { path: 'outline/arc.md', content: '# Imported Arc' },
      { path: 'book/new-scene.md', content: '# New Scene' },
    ], tempRoot)

    expect(preview.totalFiles).toBe(2)
    expect(preview.newFiles).toBe(1)
    expect(preview.existingFiles).toBe(1)
    expect(preview.files.find((file) => file.path === 'outline/arc.md')?.exists).toBe(true)
    expect(preview.files.find((file) => file.path === 'book/new-scene.md')?.exists).toBe(false)
  })
})