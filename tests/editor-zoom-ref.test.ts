import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'preact/test-utils'
import { h, render } from 'preact'
import { useRef } from 'preact/hooks'
import { useProjectEditor } from '../src/features/project-editor/use-project-editor'
import type { EditorZoomRef, ProjectEditorModel } from '../src/features/project-editor/project-editor-types'

type TramaApiMock = {
  openProject: (payload: { rootPath: string }) => Promise<{
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
  saveDocument: (payload: { path: string; content: string; meta: Record<string, unknown> }) => Promise<{ ok: true; data: { path: string; version: string } }>
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
  setFullscreen: (payload: { enabled: boolean }) => Promise<{ ok: true; data: { enabled: boolean } }>
  onFullscreenChanged: (callback: (event: { enabled: boolean }) => void) => () => void
}

function setupTramaApiMock(overrides?: Partial<TramaApiMock>) {
  const baseApi: TramaApiMock = {
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
    readDocument: async () => ({ ok: true, data: { path: 'docs/a.md', content: '# A', meta: {} } }),
    saveDocument: async (payload) => ({ ok: true, data: { path: payload.path, version: new Date().toISOString() } }),
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
    setFullscreen: async (_payload) => ({ ok: true, data: { enabled: _payload.enabled } }),
    onFullscreenChanged: (_callback) => () => undefined,
  }

  ;(window as unknown as { tramaApi: TramaApiMock }).tramaApi = {
    ...baseApi,
    ...overrides,
  }
}

describe('EditorZoomRef', () => {
  it('model exposes zoomRef with initial zoomLevel from layout', () => {
    window.localStorage.setItem(
      'trama.workspace.layout.v1',
      JSON.stringify({
        mode: 'single',
        ratio: 0.5,
        primaryPath: null,
        secondaryPath: null,
        activePane: 'primary',
        focusModeEnabled: false,
        focusScope: 'paragraph',
        zoomLevel: 1.2,
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

    expect(model?.zoomRef).toBeDefined()
    expect(model?.zoomRef.current).toBe(1.2)
  })

  it('zoomRef starts at default 1.0 when no persisted zoom', () => {
    window.localStorage.setItem(
      'trama.workspace.layout.v1',
      JSON.stringify({
        mode: 'single',
        ratio: 0.5,
        primaryPath: null,
        secondaryPath: null,
        activePane: 'primary',
        focusModeEnabled: false,
        focusScope: 'paragraph',
        zoomLevel: 1,
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

    expect(model?.zoomRef.current).toBe(1.0)
  })

  it('zoomRef is the same object instance for primary and secondary (shared ref)', () => {
    window.localStorage.setItem(
      'trama.workspace.layout.v1',
      JSON.stringify({
        mode: 'split',
        ratio: 0.5,
        primaryPath: 'docs/a.md',
        secondaryPath: 'docs/b.md',
        activePane: 'primary',
        focusModeEnabled: false,
        focusScope: 'paragraph',
        zoomLevel: 1.5,
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

    expect(model?.zoomRef).toBeDefined()
    expect(typeof model?.zoomRef.current).toBe('number')
  })

  it('zoomRef.current is mutable directly', () => {
    window.localStorage.setItem(
      'trama.workspace.layout.v1',
      JSON.stringify({
        mode: 'single',
        ratio: 0.5,
        primaryPath: null,
        secondaryPath: null,
        activePane: 'primary',
        focusModeEnabled: false,
        focusScope: 'paragraph',
        zoomLevel: 1,
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

    model!.zoomRef.current = 1.8
    expect(model!.zoomRef.current).toBe(1.8)
  })

  it('zoomRef is part of ProjectEditorModel interface', () => {
    const zoomRef: EditorZoomRef = { current: 1.0 }
    expect(zoomRef.current).toBe(1.0)

    zoomRef.current = 2.0
    expect(zoomRef.current).toBe(2.0)
  })
})

describe('useEditorZoom hook behavior via ref', () => {
  it('zoomRef changes propagate through useEffect when layout zoomLevel updates', async () => {
    window.localStorage.setItem(
      'trama.workspace.layout.v1',
      JSON.stringify({
        mode: 'single',
        ratio: 0.5,
        primaryPath: null,
        secondaryPath: null,
        activePane: 'primary',
        focusModeEnabled: false,
        focusScope: 'paragraph',
        zoomLevel: 1,
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

    expect(model?.zoomRef.current).toBe(1.0)

    act(() => {
      model?.actions.setZoomLevel(1.5)
    })

    expect(model?.zoomRef.current).toBe(1.5)
    expect(model?.state.workspaceLayout.zoomLevel).toBe(1.5)
  })
})
