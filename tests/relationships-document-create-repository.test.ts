/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { DocumentRepository } from '../electron/services/document-repository'

describe('document repository relationships create', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('creates a relationships markdown file with an empty chart config and default presets', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-relationships-create-repo-'))
    const repository = new DocumentRepository()

    const result = await repository.createRelationshipsDocument(
      tempRoot,
      'lore/relationships.md',
      'Character Relationships',
    )

    expect(result.path).toBe('lore/relationships.md')

    const markdown = await readFile(path.join(tempRoot, result.path), 'utf8')
    expect(markdown).toContain('type: relationships')
    expect(markdown).toContain('name: Character Relationships')
    expect(markdown).toContain('nodes: []')
    expect(markdown).toContain('edges: []')
    expect(markdown).toContain('edgePresets:')
    expect(markdown).toContain('name: Family')
  })

  it('refuses to overwrite an existing document', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-relationships-create-repo-'))
    const repository = new DocumentRepository()
    await writeFile(path.join(tempRoot, 'relationships.md'), 'existing', 'utf8')

    await expect(repository.createRelationshipsDocument(tempRoot, 'relationships.md', 'Chart'))
      .rejects.toThrow('already exists')
  })
})
