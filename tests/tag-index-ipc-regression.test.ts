// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  handleOpenProject,
  handleSaveDocument,
  handleTagGetIndex,
  handleTagResolve,
  shutdownIpcServices,
} from '../electron/ipc/handlers'

describe('tag index IPC regression', () => {
  const tempRoots: string[] = []

  afterEach(async () => {
    await shutdownIpcServices()

    for (const root of tempRoots.splice(0)) {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('refreshes tag index immediately after saving updated frontmatter tags', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-tag-ipc-'))
    tempRoots.push(projectRoot)

    await mkdir(path.join(projectRoot, 'book'), { recursive: true })
    await writeFile(path.join(projectRoot, 'book', 'scene.md'), '# Scene\n', 'utf8')

    const openResponse = await handleOpenProject({ rootPath: projectRoot })
    expect(openResponse.ok).toBe(true)

    const initialIndexResponse = await handleTagGetIndex()
    expect(initialIndexResponse.ok).toBe(true)
    if (!initialIndexResponse.ok) {
      return
    }
    expect(initialIndexResponse.data.tags.norte).toBeUndefined()

    const saveResponse = await handleSaveDocument({
      path: 'book/scene.md',
      content: '# Scene\n',
      meta: { tags: ['norte'] },
    })
    expect(saveResponse.ok).toBe(true)

    const updatedIndexResponse = await handleTagGetIndex()
    expect(updatedIndexResponse.ok).toBe(true)
    if (!updatedIndexResponse.ok) {
      return
    }

    expect(updatedIndexResponse.data.tags.norte).toBe('book/scene.md')

    const resolveResponse = await handleTagResolve({ text: 'El norte resiste.' })
    expect(resolveResponse.ok).toBe(true)
    if (!resolveResponse.ok) {
      return
    }

    expect(resolveResponse.data.matches).toHaveLength(1)
    expect(resolveResponse.data.matches[0].filePath).toBe('book/scene.md')
  })

  it('removes stale tags from index after saving without tags', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-tag-ipc-'))
    tempRoots.push(projectRoot)

    await mkdir(path.join(projectRoot, 'book'), { recursive: true })
    await writeFile(path.join(projectRoot, 'book', 'scene.md'), '# Scene\n', 'utf8')

    const openResponse = await handleOpenProject({ rootPath: projectRoot })
    expect(openResponse.ok).toBe(true)

    const addTagResponse = await handleSaveDocument({
      path: 'book/scene.md',
      content: '# Scene\n',
      meta: { tags: ['norte'] },
    })
    expect(addTagResponse.ok).toBe(true)

    const removeTagResponse = await handleSaveDocument({
      path: 'book/scene.md',
      content: '# Scene\n',
      meta: {},
    })
    expect(removeTagResponse.ok).toBe(true)

    const updatedIndexResponse = await handleTagGetIndex()
    expect(updatedIndexResponse.ok).toBe(true)
    if (!updatedIndexResponse.ok) {
      return
    }

    expect(updatedIndexResponse.data.tags.norte).toBeUndefined()

    const resolveResponse = await handleTagResolve({ text: 'El norte resiste.' })
    expect(resolveResponse.ok).toBe(true)
    if (!resolveResponse.ok) {
      return
    }

    expect(resolveResponse.data.matches).toHaveLength(0)
  })
})
