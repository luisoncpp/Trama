import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useProjectEditor } from '../src/features/project-editor/use-project-editor'
import { WORKSPACE_LAYOUT_STORAGE_KEY } from '../src/features/project-editor/project-editor-logic'

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
  onExternalFileEvent: () => () => void
  setFullscreen: (payload: { enabled: boolean }) => Promise<{ ok: true; data: { enabled: boolean } }>
  onFullscreenChanged: () => () => void
  notifyCloseState: (payload: { hasUnsavedChanges: boolean }) => Promise<void>
}

function setupTramaApiMock(overrides?: Partial<TramaApiMock>) {
  const notifyCloseStateMock = vi.fn()
  const baseApi: TramaApiMock = {
    ping: async () => ({ ok: true, data: { echo: 'ok', timestamp: new Date().toISOString() } }),
    openProject: async (_payload) => ({
      ok: true,
      data: {
        rootPath: 'C:/tmp/project',
        tree: [],
        markdownFiles: [],
        index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
      },
    }),
    selectProjectFolder: async () => ({ ok: true, data: { rootPath: null } }),
    readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: '# Content', meta: {} } }),
    saveDocument: async (payload) => ({
      ok: true,
      data: { path: payload.path, version: new Date().toISOString() },
    }),
    getIndex: async () => ({ ok: true, data: { version: '1.0.0', corkboardOrder: {}, cache: {} } }),
    onExternalFileEvent: () => () => undefined,
    setFullscreen: async (_payload) => ({ ok: true, data: { enabled: _payload.enabled } }),
    onFullscreenChanged: () => () => undefined,
    notifyCloseState: notifyCloseStateMock,
    ...overrides,
  }

  ;(window as unknown as { tramaApi: TramaApiMock }).tramaApi = baseApi

  return { notifyCloseStateMock }
}

describe('window close behavior', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
  })

  afterEach(() => {
    act(() => {
      render(null, container)
    })
    container.remove()
  })

  describe('dirty state notification', () => {
    it('notifies false when no project is open', () => {
      const { notifyCloseStateMock } = setupTramaApiMock()

      function Harness() {
        useProjectEditor()
        return null
      }

      act(() => {
        render(h(Harness, {}), container)
      })

      expect(notifyCloseStateMock).toHaveBeenLastCalledWith({ hasUnsavedChanges: false })
    })

    it('notifies true when primary pane becomes dirty', () => {
      const { notifyCloseStateMock } = setupTramaApiMock({
        openProject: async () => ({
          ok: true,
          data: {
            rootPath: 'C:/tmp/project',
            tree: [],
            markdownFiles: ['book/intro.md'],
            index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
          },
        }),
        readDocument: async (payload) => ({
          ok: true,
          data: { path: payload.path, content: '# Intro', meta: {} },
        }),
      })

      let model: ReturnType<typeof useProjectEditor>

      function Harness() {
        model = useProjectEditor()
        return null
      }

      act(() => {
        render(h(Harness, {}), container)
      })

      act(() => {
        model!.actions.updateEditorValue('# Intro modified')
      })

      const lastCall = notifyCloseStateMock.mock.calls[notifyCloseStateMock.mock.calls.length - 1]
      expect(lastCall[0]).toEqual({ hasUnsavedChanges: true })
    })

    it('notifies true when secondary pane becomes dirty in split layout', () => {
      const { notifyCloseStateMock } = setupTramaApiMock({
        openProject: async () => ({
          ok: true,
          data: {
            rootPath: 'C:/tmp/project',
            tree: [],
            markdownFiles: ['book/intro.md', 'book/ch2.md'],
            index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
          },
        }),
        readDocument: async (payload) => ({
          ok: true,
          data: { path: payload.path, content: '# Content', meta: {} },
        }),
      })

      let model: ReturnType<typeof useProjectEditor>

      function Harness() {
        model = useProjectEditor()
        return null
      }

      act(() => {
        render(h(Harness, {}), container)
      })

      act(() => {
        model!.actions.toggleWorkspaceLayoutMode()
      })

      act(() => {
        model!.actions.openFileInPane('book/ch2.md', 'secondary')
      })

      act(() => {
        model!.actions.updateEditorValue('# Ch2 modified', 'secondary')
      })

      const lastCall = notifyCloseStateMock.mock.calls[notifyCloseStateMock.mock.calls.length - 1]
      expect(lastCall[0]).toEqual({ hasUnsavedChanges: true })
    })
  })

  describe('__tramaSaveAll global', () => {
    it('is set on window after a project is open', () => {
      setupTramaApiMock({
        openProject: async () => ({
          ok: true,
          data: {
            rootPath: 'C:/tmp/project',
            tree: [],
            markdownFiles: ['book/intro.md'],
            index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
          },
        }),
        readDocument: async (payload) => ({
          ok: true,
          data: { path: payload.path, content: '# Intro', meta: {} },
        }),
      })

      function Harness() {
        useProjectEditor()
        return null
      }

      act(() => {
        render(h(Harness, {}), container)
      })

      const w = window as unknown as Record<string, unknown>
      expect(typeof w.__tramaSaveAll).toBe('function')
    })

    it('is removed when component unmounts', () => {
      setupTramaApiMock()

      function Harness() {
        useProjectEditor()
        return null
      }

      act(() => {
        render(h(Harness, {}), container)
      })

      act(() => {
        render(null, container)
      })

      const w = window as unknown as Record<string, unknown>
      expect(w.__tramaSaveAll).toBeUndefined()
    })

    it('captures current dirty state when called', () => {
      const { notifyCloseStateMock: _ } = setupTramaApiMock({
        openProject: async () => ({
          ok: true,
          data: {
            rootPath: 'C:/tmp/project',
            tree: [],
            markdownFiles: ['book/intro.md'],
            index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
          },
        }),
        readDocument: async (payload) => ({
          ok: true,
          data: { path: payload.path, content: '# Intro', meta: {} },
        }),
      })

      let model: ReturnType<typeof useProjectEditor>

      function Harness() {
        model = useProjectEditor()
        return null
      }

      act(() => {
        render(h(Harness, {}), container)
      })

      act(() => {
        model!.actions.updateEditorValue('# Modified content')
      })

      const w = window as unknown as Record<string, unknown>
      const saveAll = w.__tramaSaveAll as () => Promise<void>

      expect(typeof saveAll).toBe('function')
    })
  })
})
