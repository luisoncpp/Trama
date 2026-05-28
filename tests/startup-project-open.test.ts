import { describe, expect, it, vi } from 'vitest'
import { restoreLastProjectOrPickFolder } from '../src/features/project-editor/startup-project-open'

describe('startup project open', () => {
  it('opens the remembered project when validation succeeds', async () => {
    const openProject = vi.fn(async () => undefined)
    const pickProjectFolder = vi.fn(async () => undefined)
    const validateProjectFolder = vi.fn(async () => true)

    await restoreLastProjectOrPickFolder({
      lastProjectRootPath: 'C:/tmp/project',
      openProject,
      pickProjectFolder,
      validateProjectFolder,
    })

    expect(validateProjectFolder).toHaveBeenCalledWith('C:/tmp/project')
    expect(openProject).toHaveBeenCalledWith('C:/tmp/project')
    expect(pickProjectFolder).not.toHaveBeenCalled()
  })

  it('falls back to folder picker when there is no remembered project', async () => {
    const openProject = vi.fn(async () => undefined)
    const pickProjectFolder = vi.fn(async () => undefined)
    const validateProjectFolder = vi.fn(async () => true)

    await restoreLastProjectOrPickFolder({
      lastProjectRootPath: null,
      openProject,
      pickProjectFolder,
      validateProjectFolder,
    })

    expect(validateProjectFolder).not.toHaveBeenCalled()
    expect(openProject).not.toHaveBeenCalled()
    expect(pickProjectFolder).toHaveBeenCalledTimes(1)
  })

  it('clears invalid remembered project and falls back to folder picker', async () => {
    const openProject = vi.fn(async () => undefined)
    const pickProjectFolder = vi.fn(async () => undefined)
    const validateProjectFolder = vi.fn(async () => false)
    const clearLastProjectRootPath = vi.fn()

    await restoreLastProjectOrPickFolder({
      lastProjectRootPath: 'C:/tmp/missing-project',
      openProject,
      pickProjectFolder,
      validateProjectFolder,
      clearLastProjectRootPath,
    })

    expect(validateProjectFolder).toHaveBeenCalledWith('C:/tmp/missing-project')
    expect(clearLastProjectRootPath).toHaveBeenCalledTimes(1)
    expect(openProject).not.toHaveBeenCalled()
    expect(pickProjectFolder).toHaveBeenCalledTimes(1)
  })
})
