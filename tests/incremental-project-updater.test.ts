/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { applyIncrementalUpdate } from '../electron/services/incremental-project-updater'
import type { TreeItem } from '../src/shared/ipc'

function buildFixtureTree(): TreeItem[] {
  return [
    {
      id: 'book',
      title: 'book',
      path: 'book',
      type: 'folder',
      children: [
        {
          id: 'book/chapter-1',
          title: 'chapter-1',
          path: 'book/chapter-1',
          type: 'folder',
          children: [
            { id: 'book/chapter-1/scene-a.md', title: 'scene-a', path: 'book/chapter-1/scene-a.md', type: 'file' },
            { id: 'book/chapter-1/scene-b.md', title: 'scene-b', path: 'book/chapter-1/scene-b.md', type: 'file' },
          ],
        },
        {
          id: 'book/chapter-2',
          title: 'chapter-2',
          path: 'book/chapter-2',
          type: 'folder',
          children: [
            { id: 'book/chapter-2/scene-c.md', title: 'scene-c', path: 'book/chapter-2/scene-c.md', type: 'file' },
          ],
        },
      ],
    },
    {
      id: 'outline',
      title: 'outline',
      path: 'outline',
      type: 'folder',
      children: [
        { id: 'outline/act-1.md', title: 'act-1', path: 'outline/act-1.md', type: 'file' },
      ],
    },
  ]
}

function buildFixtureCache() {
  return {
    tree: buildFixtureTree(),
    markdownFiles: [
      'book/chapter-1/scene-a.md',
      'book/chapter-1/scene-b.md',
      'book/chapter-2/scene-c.md',
      'outline/act-1.md',
    ],
    metaByPath: {
      'book/chapter-1/scene-a.md': { name: 'Scene A' },
      'book/chapter-1/scene-b.md': { name: 'Scene B' },
      'book/chapter-2/scene-c.md': { name: 'Scene C' },
      'outline/act-1.md': { name: 'Act 1' },
    },
  }
}

describe('incremental project updater', () => {
  it('adds a created file to tree, markdownFiles, and metaByPath', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-incr-'))
    const newFilePath = path.join(projectRoot, 'book', 'chapter-1', 'scene-d.md')
    await mkdir(path.dirname(newFilePath), { recursive: true })
    await writeFile(newFilePath, '# Scene D\n', 'utf8')

    const cache = buildFixtureCache()
    const updated = await applyIncrementalUpdate(
      cache,
      { createdFiles: ['book/chapter-1/scene-d.md'] },
      projectRoot,
    )

    expect(updated.markdownFiles).toContain('book/chapter-1/scene-d.md')
    expect(updated.metaByPath['book/chapter-1/scene-d.md']).toEqual({})

    const chapter1 = updated.tree[0].children?.[0]
    expect(chapter1?.children?.some((n) => n.path === 'book/chapter-1/scene-d.md')).toBe(true)
  })

  it('removes a deleted file from tree, markdownFiles, and metaByPath', async () => {
    const cache = buildFixtureCache()
    const updated = await applyIncrementalUpdate(
      cache,
      { deletedFiles: ['book/chapter-1/scene-a.md'] },
      '',
    )

    expect(updated.markdownFiles).not.toContain('book/chapter-1/scene-a.md')
    expect(updated.metaByPath['book/chapter-1/scene-a.md']).toBeUndefined()

    const chapter1 = updated.tree[0].children?.[0]
    expect(chapter1?.children?.some((n) => n.path === 'book/chapter-1/scene-a.md')).toBe(false)
  })

  it('updates paths for a renamed file', async () => {
    const cache = buildFixtureCache()
    const updated = await applyIncrementalUpdate(
      cache,
      { renamedFiles: [{ from: 'book/chapter-1/scene-a.md', to: 'book/chapter-1/scene-renamed.md' }] },
      '',
    )

    expect(updated.markdownFiles).not.toContain('book/chapter-1/scene-a.md')
    expect(updated.markdownFiles).toContain('book/chapter-1/scene-renamed.md')
    expect(updated.metaByPath['book/chapter-1/scene-a.md']).toBeUndefined()
    expect(updated.metaByPath['book/chapter-1/scene-renamed.md']).toEqual({ name: 'Scene A' })

    const chapter1 = updated.tree[0].children?.[0]
    expect(chapter1?.children?.some((n) => n.path === 'book/chapter-1/scene-a.md')).toBe(false)
    expect(chapter1?.children?.some((n) => n.path === 'book/chapter-1/scene-renamed.md')).toBe(true)
  })

  it('adds a created folder to tree', async () => {
    const cache = buildFixtureCache()
    const updated = await applyIncrementalUpdate(
      cache,
      { createdFolders: ['book/chapter-3'] },
      '',
    )

    const bookNode = updated.tree[0]
    expect(bookNode.children?.some((n) => n.path === 'book/chapter-3' && n.type === 'folder')).toBe(true)
  })

  it('removes a deleted folder and all its files from tree, markdownFiles, and metaByPath', async () => {
    const cache = buildFixtureCache()
    const updated = await applyIncrementalUpdate(
      cache,
      { deletedFolders: ['book/chapter-1'] },
      '',
    )

    expect(updated.markdownFiles).not.toContain('book/chapter-1/scene-a.md')
    expect(updated.markdownFiles).not.toContain('book/chapter-1/scene-b.md')
    expect(updated.metaByPath['book/chapter-1/scene-a.md']).toBeUndefined()
    expect(updated.metaByPath['book/chapter-1/scene-b.md']).toBeUndefined()

    const bookNode = updated.tree[0]
    expect(bookNode.children?.some((n) => n.path === 'book/chapter-1')).toBe(false)
  })

  it('updates paths for a renamed folder and all descendants', async () => {
    const cache = buildFixtureCache()
    const updated = await applyIncrementalUpdate(
      cache,
      { renamedFolders: [{ from: 'book/chapter-1', to: 'book/chapter-renamed' }] },
      '',
    )

    expect(updated.markdownFiles).not.toContain('book/chapter-1/scene-a.md')
    expect(updated.markdownFiles).not.toContain('book/chapter-1/scene-b.md')
    expect(updated.markdownFiles).toContain('book/chapter-renamed/scene-a.md')
    expect(updated.markdownFiles).toContain('book/chapter-renamed/scene-b.md')

    expect(updated.metaByPath['book/chapter-1/scene-a.md']).toBeUndefined()
    expect(updated.metaByPath['book/chapter-renamed/scene-a.md']).toEqual({ name: 'Scene A' })

    const bookNode = updated.tree[0]
    expect(bookNode.children?.some((n) => n.path === 'book/chapter-1')).toBe(false)
    const renamedFolder = bookNode.children?.find((n) => n.path === 'book/chapter-renamed')
    expect(renamedFolder).toBeDefined()
    expect(renamedFolder?.children?.some((n) => n.path === 'book/chapter-renamed/scene-a.md')).toBe(true)
    expect(renamedFolder?.children?.some((n) => n.path === 'book/chapter-renamed/scene-b.md')).toBe(true)
  })

  it('sorts markdownFiles after incremental update', async () => {
    const cache = buildFixtureCache()
    const updated = await applyIncrementalUpdate(
      cache,
      { createdFiles: ['book/chapter-2/scene-aaa.md'] },
      '',
    )

    const chapter2 = updated.tree[0].children?.[1]
    expect(chapter2?.children?.[0].title).toBe('scene-aaa')
    expect(chapter2?.children?.[1].title).toBe('scene-c')
  })
})
