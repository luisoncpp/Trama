import { describe, expect, it } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useProjectEditor } from '../src/features/project-editor/use-project-editor'
import type { ProjectEditorModel } from '../src/features/project-editor/project-editor-types'

type TramaApiMock = {
  ping: () => Promise<{ ok: true; data: { echo: string; timestamp: string } }>
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
  readDocument: () => Promise<{ ok: true; data: { path: string; content: string; meta: Record<string, unknown> } }>
  saveDocument: () => Promise<{ ok: true; data: { path: string; version: string } }>
  getIndex: () => Promise<{
    ok: true
    data: { version: string; corkboardOrder: Record<string, string[]>; cache: Record<string, unknown> }
  }>
  onExternalFileEvent: () => () => void
}

function setupTramaApiMock(overrides?: Partial<TramaApiMock>) {
  const baseApi: TramaApiMock = {
    ping: async () => ({ ok: true, data: { echo: 'ok', timestamp: new Date().toISOString() } }),
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
    getIndex: async () => ({ ok: true, data: { version: '1.0.0', corkboardOrder: {}, cache: {} } }),
    onExternalFileEvent: () => () => undefined,
  }

  ;(window as unknown as { tramaApi: TramaApiMock }).tramaApi = {
    ...baseApi,
    ...overrides,
  }
}

describe('useProjectEditor', () => {
  it('exposes initial state from hook', () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
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

    expect(model).toBeDefined()
    expect(model?.state.apiAvailable).toBe(true)
    expect(model?.state.statusMessage).toBe('Open a project folder to begin.')
    expect(model?.state.sidebarActiveSection).toBe('explorer')
    expect(model?.state.sidebarPanelCollapsed).toBe(false)
    expect(model?.state.sidebarPanelWidth).toBe(300)
  })

  it('updates status when folder picking is canceled', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: null } }),
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

    expect(model?.state.statusMessage).toBe('Project folder selection was canceled.')
  })

  it('persists sidebar section and layout preferences', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
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

    await act(async () => {
      model?.actions.setSidebarSection('settings')
      model?.actions.setSidebarPanelWidth(420)
      model?.actions.toggleSidebarPanelCollapsed()
    })

    expect(model?.state.sidebarActiveSection).toBe('settings')
    expect(model?.state.sidebarPanelWidth).toBe(420)
    expect(model?.state.sidebarPanelCollapsed).toBe(true)

    const persisted = window.localStorage.getItem('trama.sidebar.ui.v1')
    expect(persisted).toBeTruthy()
    expect(JSON.parse(persisted as string)).toEqual({
      activeSection: 'settings',
      panelCollapsed: true,
      panelWidth: 420,
    })
  })
})
