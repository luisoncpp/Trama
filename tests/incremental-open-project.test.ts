/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { setActiveProject } from '../electron/ipc-runtime'
import { IndexService } from '../electron/services/index-service'
import { setProjectCache, clearProjectCache } from '../electron/services/project-state-cache'
import { handleOpenProject } from '../electron/ipc/handlers/project-handlers/project-open-handler'

describe('handleOpenProject incremental update', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    clearProjectCache()
    if (!tempRoot) {
      return
    }
    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  })

  it('does a full scan when no cache exists', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-open-proj-'))
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await writeFile(path.join(tempRoot, 'book', 'scene.md'), '# Scene', 'utf8')

    const response = await handleOpenProject({ rootPath: tempRoot })

    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.data.markdownFiles).toContain('book/scene.md')
  })

  it('uses incremental update when cache exists', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-open-proj-'))
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await writeFile(path.join(tempRoot, 'book', 'scene.md'), '# Scene', 'utf8')

    // First call — full scan, populates cache
    const first = await handleOpenProject({ rootPath: tempRoot })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    setActiveProject(tempRoot, new IndexService(tempRoot))

    // Create a new file on disk
    await writeFile(path.join(tempRoot, 'book', 'new-scene.md'), '# New Scene', 'utf8')

    // Second call — incremental update
    const second = await handleOpenProject({
      rootPath: tempRoot,
      incrementalUpdate: { createdFiles: ['book/new-scene.md'] },
    })

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.data.markdownFiles).toContain('book/scene.md')
    expect(second.data.markdownFiles).toContain('book/new-scene.md')
    expect(second.data.tree.some((n) => n.path === 'book' && n.children?.some((c) => c.path === 'book/new-scene.md'))).toBe(true)
  })

  it('invalidates cache when rootPath changes', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-open-proj-'))
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await writeFile(path.join(tempRoot, 'book', 'scene.md'), '# Scene', 'utf8')

    const first = await handleOpenProject({ rootPath: tempRoot })
    expect(first.ok).toBe(true)

    const otherRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-open-proj-other-'))
    await mkdir(path.join(otherRoot, 'outline'), { recursive: true })
    await writeFile(path.join(otherRoot, 'outline', 'act.md'), '# Act', 'utf8')

    // Call with different root — should do full scan, not use cache from first project
    const second = await handleOpenProject({ rootPath: otherRoot })

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.data.markdownFiles).toContain('outline/act.md')
    expect(second.data.markdownFiles).not.toContain('book/scene.md')

    await rm(otherRoot, { recursive: true, force: true })
  })

  it('removes deleted file via incremental update', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-open-proj-'))
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await writeFile(path.join(tempRoot, 'book', 'scene.md'), '# Scene', 'utf8')

    const first = await handleOpenProject({ rootPath: tempRoot })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    setActiveProject(tempRoot, new IndexService(tempRoot))

    const second = await handleOpenProject({
      rootPath: tempRoot,
      incrementalUpdate: { deletedFiles: ['book/scene.md'] },
    })

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.data.markdownFiles).not.toContain('book/scene.md')
    expect(second.data.tree.some((n) => n.path === 'book' && n.children?.some((c) => c.path === 'book/scene.md'))).toBe(false)
  })

  it('updates index file on incremental update', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-open-proj-'))
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await writeFile(path.join(tempRoot, 'book', 'scene.md'), '# Scene', 'utf8')

    const first = await handleOpenProject({ rootPath: tempRoot })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    setActiveProject(tempRoot, new IndexService(tempRoot))

    await writeFile(path.join(tempRoot, 'book', 'new-scene.md'), '# New Scene', 'utf8')

    const second = await handleOpenProject({
      rootPath: tempRoot,
      incrementalUpdate: { createdFiles: ['book/new-scene.md'] },
    })

    expect(second.ok).toBe(true)
    if (!second.ok) return

    const indexRaw = await readFile(path.join(tempRoot, '.trama.index.json'), 'utf8')
    const index = JSON.parse(indexRaw)
    expect(Object.keys(index.cache)).toContain('book/new-scene.md')
  })

  it('uses cache with empty incremental update to skip rescan for reorder', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-open-proj-'))
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await writeFile(path.join(tempRoot, 'book', 'scene.md'), '# Scene', 'utf8')

    const first = await handleOpenProject({ rootPath: tempRoot })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    setActiveProject(tempRoot, new IndexService(tempRoot))

    // Simulate a reorder: update corkboardOrder on disk
    const indexPath = path.join(tempRoot, '.trama.index.json')
    const indexRaw = await readFile(indexPath, 'utf8')
    const index = JSON.parse(indexRaw)
    index.corkboardOrder = { 'book': ['book/scene.md'] }
    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8')

    // Call openProject with empty incremental update — should use cache
    const second = await handleOpenProject({
      rootPath: tempRoot,
      incrementalUpdate: {},
    })

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.data.markdownFiles).toContain('book/scene.md')
    expect(second.data.index.corkboardOrder).toEqual({ 'book': ['book/scene.md'] })
  })
})
