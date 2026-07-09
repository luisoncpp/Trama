/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { searchProjectMarkdown } from '../electron/services/project-search-service'

async function writeProjectFile(root: string, relativePath: string, content: string): Promise<void> {
  const filePath = path.join(root, ...relativePath.split('/'))
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf-8')
}

describe('project search service', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (!tempRoot) {
      return
    }

    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  async function buildProject(): Promise<string> {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-search-'))
    await writeProjectFile(tempRoot, 'book/Scene-001.md', 'The dragon roared. A dragon!')
    await writeProjectFile(tempRoot, 'lore/Beasts.md', '---\nname: Dragonlore\ntags: [dragon]\n---\n\nDragons and dragonkin.')
    await writeProjectFile(tempRoot, 'outline/Act-1.md', 'No beasts here.')
    await writeProjectFile(tempRoot, 'notes/Ignored.md', 'dragon dragon dragon')
    return tempRoot
  }

  it('returns per-file match counts for matching documents only', async () => {
    const root = await buildProject()

    const results = await searchProjectMarkdown(root, { query: 'dragon', caseSensitive: false, wholeWord: false })

    expect(results).toEqual([
      { path: 'book/Scene-001.md', matchCount: 2 },
      { path: 'lore/Beasts.md', matchCount: 2 },
    ])
  })

  it('ignores files outside the managed section roots', async () => {
    const root = await buildProject()

    const results = await searchProjectMarkdown(root, { query: 'dragon', caseSensitive: false, wholeWord: false })

    expect(results.some((file) => file.path.startsWith('notes/'))).toBe(false)
  })

  it('does not match text inside frontmatter', async () => {
    const root = await buildProject()

    const results = await searchProjectMarkdown(root, { query: 'dragonlore', caseSensitive: false, wholeWord: false })

    expect(results).toEqual([])
  })

  it('applies case sensitivity', async () => {
    const root = await buildProject()

    const results = await searchProjectMarkdown(root, { query: 'Dragon', caseSensitive: true, wholeWord: false })

    expect(results).toEqual([
      { path: 'lore/Beasts.md', matchCount: 1 },
    ])
  })

  it('applies whole-word matching', async () => {
    const root = await buildProject()

    const results = await searchProjectMarkdown(root, { query: 'dragon', caseSensitive: false, wholeWord: true })

    expect(results).toEqual([
      { path: 'book/Scene-001.md', matchCount: 2 },
    ])
  })
})
