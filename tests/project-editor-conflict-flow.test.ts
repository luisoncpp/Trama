import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useProjectEditor } from '../src/features/project-editor/use-project-editor'
import type { ProjectEditorModel } from '../src/features/project-editor/project-editor-types'
import type { ExternalFileEvent } from '../src/shared/ipc'

type TramaApiMock = {
  ping: () => Promise<{ ok: true; data: { echo: string; timestamp: string } }>
  openProject: (payload: { rootPath: string }) => Promise<{
    ok: true
    data: {
      rootPath: string
      tree: Array<unknown>
      markdownFiles: string[]
      index: { version: string; corkboardOrder: Record<string, string[]>; cache: Record<string, unknown> }
    }
  }>
  selectProjectFolder: () => Promise<{ ok: true; data: { rootPath: string | null } }>
  readDocument: (payload: { path: string }) => Promise<{
    ok: true
    data: { path: string; content: string; meta: Record<string, unknown> }
  }>
  saveDocument: (payload: {
    path: string
    content: string
    meta: Record<string, unknown>
  }) => Promise<{ ok: true; data: { path: string; version: string } }>
  getIndex: () => Promise<{
    ok: true
    data: { version: string; corkboardOrder: Record<string, string[]>; cache: Record<string, unknown> }
  }>
  onExternalFileEvent: (callback: (event: ExternalFileEvent) => void) => () => void
  setFullscreen: (payload: { enabled: boolean }) => Promise<{ ok: true; data: { enabled: boolean } }>
  onFullscreenChanged: (callback: (event: { enabled: boolean }) => void) => () => void
}

interface SetupResult {
  openProjectMock: ReturnType<typeof vi.fn>
  readDocumentMock: ReturnType<typeof vi.fn>
  saveDocumentMock: ReturnType<typeof vi.fn>
  emitExternalEvent: (event: ExternalFileEvent) => void
}

function setupTramaApiMock(overrides?: Partial<TramaApiMock>): SetupResult {
  const markdownFiles = ['docs/a.md']
  const documentStore = new Map<string, { content: string; meta: Record<string, unknown> }>([
    ['docs/a.md', { content: '# A', meta: {} }],
  ])
  let externalListener: ((event: ExternalFileEvent) => void) | null = null

  const openProjectMock = vi.fn(async () => ({
    ok: true as const,
    data: {
      rootPath: 'C:/tmp/project',
      tree: [],
      markdownFiles: [...markdownFiles],
      index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
    },
  }))

  const readDocumentMock = vi.fn(async (payload: { path: string }) => ({
    ok: true as const,
    data: {
      path: payload.path,
      content: documentStore.get(payload.path)?.content ?? '# Missing',
      meta: documentStore.get(payload.path)?.meta ?? {},
    },
  }))

  const saveDocumentMock = vi.fn(
    async (payload: { path: string; content: string; meta: Record<string, unknown> }) => {
      documentStore.set(payload.path, {
        content: payload.content,
        meta: payload.meta,
      })

      if (!markdownFiles.includes(payload.path)) {
        markdownFiles.push(payload.path)
      }

      return {
        ok: true as const,
        data: {
          path: payload.path,
          version: new Date().toISOString(),
        },
      }
    },
  )

  const baseApi: TramaApiMock = {
    ping: async () => ({ ok: true, data: { echo: 'ok', timestamp: new Date().toISOString() } }),
    openProject: openProjectMock,
    selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
    readDocument: readDocumentMock,
    saveDocument: saveDocumentMock,
    getIndex: async () => ({ ok: true, data: { version: '1.0.0', corkboardOrder: {}, cache: {} } }),
    onExternalFileEvent: (callback) => {
      externalListener = callback
      return () => {
        externalListener = null
      }
    },
    setFullscreen: async (_payload) => ({ ok: true, data: { enabled: _payload.enabled } }),
    onFullscreenChanged: (_callback) => () => undefined,
  }

  ;(window as unknown as { tramaApi: TramaApiMock }).tramaApi = {
    ...baseApi,
    ...overrides,
  }

  return {
    openProjectMock,
    readDocumentMock,
    saveDocumentMock,
    emitExternalEvent: (event: ExternalFileEvent) => {
      if (externalListener) {
        externalListener(event)
      }
    },
  }
}

describe('project editor conflict flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('autosaves after debounce and uses latest content only once', async () => {
    const { saveDocumentMock } = setupTramaApiMock()
    const AUTOSAVE_DELAY_MS = 10 * 60 * 1000

    let model: ProjectEditorModel | undefined

    function Harness() {
      model = useProjectEditor()
      return null
    }

    const container = document.createElement('div')
    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      await model?.actions.pickProjectFolder()
    })

    act(() => {
      model?.actions.updateEditorValue('# A\n\nprimer cambio')
      model?.actions.updateEditorValue('# A\n\ncambio final')
    })

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1)
      await Promise.resolve()
    })

    expect(saveDocumentMock).toHaveBeenCalledTimes(0)

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    expect(saveDocumentMock.mock.calls[0]?.[0]).toMatchObject({
      path: 'docs/a.md',
      content: '# A\n\ncambio final',
    })
  })

  it('handles conflict compare and save-as-copy flow', async () => {
    const { saveDocumentMock, readDocumentMock, openProjectMock, emitExternalEvent } = setupTramaApiMock()

    let model: ProjectEditorModel | undefined

    function Harness() {
      model = useProjectEditor()
      return null
    }

    const container = document.createElement('div')
    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      await model?.actions.pickProjectFolder()
    })

    act(() => {
      model?.actions.updateEditorValue('# A\n\nlocal change')
    })

    act(() => {
      emitExternalEvent({
        path: 'docs/a.md',
        event: 'change',
        source: 'external',
        timestamp: new Date().toISOString(),
      })
    })

    expect(model?.state.externalConflictPath).toBe('docs/a.md')

    await act(async () => {
      model?.actions.resolveConflictCompare()
      await Promise.resolve()
    })

    expect(readDocumentMock).toHaveBeenCalledWith({ path: 'docs/a.md' })
    expect(model?.state.conflictComparisonContent).toBe('# A')

    await act(async () => {
      model?.actions.resolveConflictSaveAsCopy()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(saveDocumentMock).toHaveBeenCalled()
    const saveAsCopyCall = saveDocumentMock.mock.calls.find(
      (entry) => entry[0]?.path === 'docs/a.conflict-copy.md',
    )

    expect(saveAsCopyCall?.[0]).toMatchObject({
      path: 'docs/a.conflict-copy.md',
      content: '# A\n\nlocal change',
    })

    expect(openProjectMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(model?.state.selectedPath).toBe('docs/a.conflict-copy.md')
    expect(model?.state.externalConflictPath).toBeNull()
  })

  it('reload action discards local dirty content and restores disk version', async () => {
    const { emitExternalEvent, readDocumentMock } = setupTramaApiMock()

    let model: ProjectEditorModel | undefined

    function Harness() {
      model = useProjectEditor()
      return null
    }

    const container = document.createElement('div')
    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      await model?.actions.pickProjectFolder()
    })

    expect(model?.state.selectedPath).toBe('docs/a.md')
    expect(model?.state.editorValue).toBe('# A')

    act(() => {
      model?.actions.updateEditorValue('# A\n\nlocal dirty')
    })

    act(() => {
      emitExternalEvent({
        path: 'docs/a.md',
        event: 'change',
        source: 'external',
        timestamp: new Date().toISOString(),
      })
    })

    expect(model?.state.externalConflictPath).toBe('docs/a.md')
    expect(model?.state.editorValue).toBe('# A\n\nlocal dirty')

    await act(async () => {
      model?.actions.resolveConflictReload()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(readDocumentMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(model?.state.editorValue).toBe('# A')
    expect(model?.state.externalConflictPath).toBeNull()
    expect(model?.state.conflictComparisonContent).toBeNull()
    expect(model?.state.isDirty).toBe(false)
  })

  it('blocks pane switch in split mode when active document is dirty', async () => {
    setupTramaApiMock({
      openProject: async () => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md', 'docs/b.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload: { path: string }) => ({
        ok: true,
        data: {
          path: payload.path,
          content: payload.path === 'docs/b.md' ? '# B' : '# A',
          meta: {},
        },
      }),
    })

    let model: ProjectEditorModel | undefined

    function Harness() {
      model = useProjectEditor()
      return null
    }

    const container = document.createElement('div')
    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      await model?.actions.pickProjectFolder()
    })

    expect(model?.state.selectedPath).toBe('docs/a.md')
    expect(model?.state.workspaceLayout.primaryPath).toBe('docs/a.md')

    await act(async () => {
      model?.actions.toggleWorkspaceLayoutMode()
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.mode).toBe('split')
    expect(model?.state.workspaceLayout.secondaryPath).toBe('docs/b.md')

    await act(async () => {
      model?.actions.setWorkspaceActivePane('secondary')
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.activePane).toBe('secondary')
    expect(model?.state.selectedPath).toBe('docs/b.md')
    expect(model?.state.editorValue).toBe('# B')

    act(() => {
      model?.actions.updateEditorValue('# B\n\nlocal dirty')
    })

    await act(async () => {
      model?.actions.setWorkspaceActivePane('primary')
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.activePane).toBe('secondary')
    expect(model?.state.selectedPath).toBe('docs/b.md')
    expect(model?.state.statusMessage).toBe('Save or wait for autosave before switching files.')
  })

  it('keeps copied conflict document in active secondary pane after reopening project', async () => {
    const savedFiles = new Map<string, string>([
      ['docs/a.md', '# A'],
      ['docs/b.md', '# B'],
    ])
    const openProjectMock = vi.fn(async () => ({
      ok: true as const,
      data: {
        rootPath: 'C:/tmp/project',
        tree: [],
        markdownFiles: [...savedFiles.keys()],
        index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
      },
    }))
    const { emitExternalEvent } = setupTramaApiMock({
      openProject: openProjectMock,
      readDocument: async (payload: { path: string }) => ({
        ok: true as const,
        data: { path: payload.path, content: savedFiles.get(payload.path) ?? '# Missing', meta: {} },
      }),
      saveDocument: async (payload: { path: string; content: string; meta: Record<string, unknown> }) => {
        savedFiles.set(payload.path, payload.content)
        openProjectMock.mockResolvedValue({
          ok: true as const,
          data: {
            rootPath: 'C:/tmp/project',
            tree: [],
            markdownFiles: [...savedFiles.keys()],
            index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
          },
        })
        return { ok: true as const, data: { path: payload.path, version: new Date().toISOString() } }
      },
    })

    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })

    await act(async () => { await model?.actions.pickProjectFolder() })
    expect(model?.state.workspaceLayout.primaryPath).toBe('docs/a.md')

    if (model?.state.workspaceLayout.mode !== 'split') {
      await act(async () => { model?.actions.toggleWorkspaceLayoutMode(); await Promise.resolve() })
    }
    expect(model?.state.workspaceLayout.mode).toBe('split')

    await act(async () => {
      model?.actions.setWorkspaceActivePane('secondary')
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(model?.state.workspaceLayout.activePane).toBe('secondary')
    expect(model?.state.selectedPath).toBe('docs/b.md')

    act(() => { model?.actions.updateEditorValue('# B\n\nlocal edit') })
    expect(model?.state.isDirty).toBe(true)

    act(() => {
      emitExternalEvent({ path: 'docs/b.md', event: 'change', source: 'external', timestamp: new Date().toISOString() })
    })
    expect(model?.state.externalConflictPath).toBe('docs/b.md')

    await act(async () => {
      model?.actions.resolveConflictSaveAsCopy()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const copyPath = 'docs/b.conflict-copy.md'
    expect(model?.state.workspaceLayout.activePane).toBe('secondary')
    expect(model?.state.workspaceLayout.secondaryPath).toBe(copyPath)
    expect(model?.state.selectedPath).toBe(copyPath)
    expect(model?.state.externalConflictPath).toBeNull()
  })

})
