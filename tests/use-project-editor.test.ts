import { describe, expect, it } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { WORKSPACE_LAYOUT_STORAGE_KEY } from '../src/features/project-editor/project-editor-logic'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../src/shared/workspace-context-menu'
import { useProjectEditor } from '../src/features/project-editor/use-project-editor'
import type { ProjectEditorModel } from '../src/features/project-editor/project-editor-types'

type TramaApiMock = {
  ping: () => Promise<{ ok: true; data: { echo: string; timestamp: string } }>
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
    readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: '# A', meta: {} } }),
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

describe('useProjectEditor', () => {
  it('exposes initial state from hook', () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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
    expect(model?.state.workspaceLayout).toEqual({
      mode: 'single',
      ratio: 0.5,
      primaryPath: null,
      secondaryPath: null,
      activePane: 'primary',
      focusModeEnabled: false,
      focusScope: 'paragraph',
    })
  })

  it('updates status when folder picking is canceled', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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

    await act(async () => {
      model?.actions.toggleWorkspaceLayoutMode()
      model?.actions.setWorkspaceLayoutRatio(0.62)
      model?.actions.setWorkspaceActivePane('primary')
    })

    const layoutPersisted = window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    expect(layoutPersisted).toBeTruthy()
    expect(JSON.parse(layoutPersisted as string)).toEqual({
      mode: 'single',
      ratio: 0.62,
      primaryPath: null,
      secondaryPath: null,
      activePane: 'primary',
      focusModeEnabled: false,
      focusScope: 'paragraph',
    })
  })

  it('creates a new article with generated name in active section', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    const createDocumentCalls: string[] = []
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async (_payload) => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['book/intro.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      createDocument: async (payload) => {
        createDocumentCalls.push(payload.path)
        return { ok: true, data: { path: payload.path, createdAt: new Date().toISOString() } }
      },
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

    await act(async () => {
      await model?.actions.createArticle({ directory: '', name: 'New-Article' })
    })

    expect(createDocumentCalls[0]).toBe('book/New-Article.md')
  })

  it('toggles workspace split layout with Ctrl+Period shortcut', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async (_payload) => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md', 'docs/b.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: '# A', meta: {} } }),
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

    expect(model?.state.workspaceLayout.mode).toBe('single')

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Period', ctrlKey: true, bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.mode).toBe('split')

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Period', ctrlKey: true, bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.mode).toBe('single')
  })

  it('saves active document with Ctrl+S shortcut', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    const saveDocumentCalls: Array<{ path: string; content: string }> = []
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async (_payload) => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: '# A', meta: {} } }),
      saveDocument: async (payload: { path: string; content: string }) => {
        saveDocumentCalls.push({ path: payload.path, content: payload.content })
        return { ok: true, data: { path: payload.path, version: new Date().toISOString() } }
      },
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

    await act(async () => {
      model?.actions.updateEditorValue('# A changed')
      await Promise.resolve()
    })

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', ctrlKey: true, bubbles: true }))
      await Promise.resolve()
    })

    expect(saveDocumentCalls.length).toBe(1)
    expect(saveDocumentCalls[0]).toEqual({ path: 'docs/a.md', content: '# A changed' })
  })

  it('applies workspace commands from context menu bridge event', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async (_payload) => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md', 'docs/b.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: '# A', meta: {} } }),
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

    await act(async () => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'toggle-split' } }))
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'toggle-focus' } }))
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'toggle-fullscreen' } }))
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.mode).toBe('split')
    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)
    expect(model?.state.workspaceLayout.focusScope).toBe('paragraph')
    expect(model?.state.workspaceLayout.ratio).toBe(0.5)
    expect(model?.state.isFullscreen).toBe(true)
  })

  it('collapses sidebar when enabling focus mode and blocks reopening while focus is active', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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

    expect(model?.state.sidebarPanelCollapsed).toBe(false)
    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(false)

    await act(async () => {
      model?.actions.toggleFocusMode()
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)
    expect(model?.state.sidebarPanelCollapsed).toBe(true)

    await act(async () => {
      model?.actions.toggleSidebarPanelCollapsed()
      await Promise.resolve()
    })

    expect(model?.state.sidebarPanelCollapsed).toBe(true)

    await act(async () => {
      model?.actions.toggleFocusMode()
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(false)

    await act(async () => {
      model?.actions.toggleSidebarPanelCollapsed()
      await Promise.resolve()
    })

    expect(model?.state.sidebarPanelCollapsed).toBe(false)
  })

  it('ESC exits focus mode when focus mode is active', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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
      model?.actions.toggleFocusMode()
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(false)
    expect(model?.state.isFullscreen).toBe(false)
  })

  it('ESC exits fullscreen when fullscreen is active', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'toggle-fullscreen' } }))
      await Promise.resolve()
    })

    expect(model?.state.isFullscreen).toBe(true)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.isFullscreen).toBe(false)
    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(false)
  })

  it('ESC exits both fullscreen and focus mode when both are active', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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
      model?.actions.toggleFocusMode()
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'toggle-fullscreen' } }))
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)
    expect(model?.state.isFullscreen).toBe(true)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(false)
    expect(model?.state.isFullscreen).toBe(false)
  })

  it('ESC does nothing when neither fullscreen nor focus mode is active', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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

    expect(model?.state.isFullscreen).toBe(false)
    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(false)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.isFullscreen).toBe(false)
    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(false)
  })

  it('ESC ignores fullscreen/focus exit when focus is in a form field', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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
      model?.actions.toggleFocusMode()
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)

    document.body.removeChild(input)
  })

  it('ESC ignores fullscreen/focus exit when a modal dialog is open', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
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
      model?.actions.toggleFocusMode()
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)

    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    document.body.appendChild(modal)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)

    document.body.removeChild(modal)
  })
})
