import { describe, expect, it } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { WORKSPACE_LAYOUT_STORAGE_KEY } from '../src/features/project-editor/project-editor-logic'
import { useProjectEditor } from '../src/features/project-editor/use-project-editor'
import type { ProjectEditorModel } from '../src/features/project-editor/project-editor-types'

type TramaApiMock = {
  openProject: () => Promise<{
    ok: true
    data: {
      rootPath: string
      tree: []
      markdownFiles: string[]
      index: { version: string; corkboardOrder: Record<string, string[]>; cache: Record<string, unknown> }
    }
  }>
  selectProjectFolder: () => Promise<{ ok: true; data: { rootPath: string | null } }>
  readDocument: (payload: { path: string }) => Promise<{ ok: true; data: { path: string; content: string; meta: Record<string, unknown> } }>
  saveDocument: () => Promise<{ ok: true; data: { path: string; version: string } }>
  createDocument: (payload: { path: string; initialContent?: string }) => Promise<{
    ok: true
    data: { path: string; createdAt: string }
  }>
  createFolder: (payload: { path: string }) => Promise<{
    ok: true
    data: { path: string; createdAt: string }
  }>
  renameDocument: (payload: { path: string; newName: string }) => Promise<{
    ok: true
    data: { path: string; renamedTo: string; updatedAt: string }
  }>
  deleteDocument: (payload: { path: string }) => Promise<{
    ok: true
    data: { path: string; deletedAt: string }
  }>
  getIndex: () => Promise<{
    ok: true
    data: { version: string; corkboardOrder: Record<string, string[]>; cache: Record<string, unknown> }
  }>
  onExternalFileEvent: () => () => void
}

function setupTramaApiMock(overrides?: Partial<TramaApiMock>) {
  const baseApi: TramaApiMock = {
    openProject: async () => ({
      ok: true,
      data: {
        rootPath: 'C:/tmp/project',
        tree: [],
        markdownFiles: [],
        index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
      },
    }),
    selectProjectFolder: async () => ({ ok: true, data: { rootPath: null } }),
    readDocument: async () => ({ ok: true, data: { path: 'docs/a.md', content: '# A', meta: {} } }),
    saveDocument: async () => ({ ok: true, data: { path: 'docs/a.md', version: new Date().toISOString() } }),
    createDocument: async (payload) => ({
      ok: true,
      data: {
        path: payload.path,
        createdAt: new Date().toISOString(),
      },
    }),
    createFolder: async (payload) => ({
      ok: true,
      data: {
        path: payload.path,
        createdAt: new Date().toISOString(),
      },
    }),
    renameDocument: async (payload) => ({
      ok: true,
      data: {
        path: payload.path,
        renamedTo: payload.newName,
        updatedAt: new Date().toISOString(),
      },
    }),
    deleteDocument: async (payload) => ({
      ok: true,
      data: {
        path: payload.path,
        deletedAt: new Date().toISOString(),
      },
    }),
    getIndex: async () => ({ ok: true, data: { version: '1.0.0', corkboardOrder: {}, cache: {} } }),
    onExternalFileEvent: () => () => undefined,
  }

  ;(window as unknown as { tramaApi: TramaApiMock }).tramaApi = {
    ...baseApi,
    ...overrides,
  }
}

describe('workspace layout persistence', () => {
  it('restores and normalizes persisted layout values on startup', () => {
    window.localStorage.setItem(
      WORKSPACE_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        mode: 'split',
        ratio: 0.9,
        primaryPath: 'docs/a.md',
        secondaryPath: 'docs/b.md',
        activePane: 'secondary',
      }),
    )
    setupTramaApiMock()

    let model: ProjectEditorModel | undefined

    function Harness() {
      model = useProjectEditor()
      return null
    }

    const container = document.createElement('div')
    act(() => {
      render(h(Harness, {}), container)
    })

    expect(model?.state.workspaceLayout).toEqual({
      mode: 'split',
      ratio: 0.7,
      primaryPath: 'docs/a.md',
      secondaryPath: 'docs/b.md',
      activePane: 'secondary',
    })
  })

  it('reconciles persisted split layout and loads active pane document after opening project', async () => {
    window.localStorage.setItem(
      WORKSPACE_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        mode: 'split',
        ratio: 0.56,
        primaryPath: 'docs/missing.md',
        secondaryPath: 'docs/b.md',
        activePane: 'secondary',
      }),
    )

    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
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

    expect(model?.state.workspaceLayout).toEqual({
      mode: 'split',
      ratio: 0.56,
      primaryPath: 'docs/a.md',
      secondaryPath: 'docs/b.md',
      activePane: 'secondary',
    })
    expect(model?.state.selectedPath).toBe('docs/b.md')
    expect(model?.state.editorValue).toBe('# B')
  })
})
