import { describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { WORKSPACE_LAYOUT_STORAGE_KEY } from '../src/features/project-editor/project-editor-logic'
import { LAST_PROJECT_STORAGE_KEY } from '../src/features/project-editor/use-last-project-state'
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
  validateProjectFolder: (payload: { rootPath: string }) => Promise<{ ok: true; data: { valid: boolean } }>
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
  gitHistoryStatus: () => Promise<{ ok: true; data: { gitAvailable: boolean; repositoryRoot: string | null; usesParentRepository: boolean; needsInitialization: boolean } }>
  saveGitSnapshot: (payload: { initializeRepository: boolean }) => Promise<{ ok: true; data: { kind: 'saved' | 'noop' | 'init-required'; repositoryRoot: string | null; createdRepository: boolean; message: string } }>
  listDocumentRevisions: (payload: { path: string; cursor?: string | null }) => Promise<{ ok: true; data: { gitAvailable: boolean; repositoryRoot: string | null; current: { path: string; hasRepository: boolean; isTracked: boolean }; revisions: Array<{ sha: string; committedAt: string; commitMessage: string; pathAtRevision: string }>; cursor: string | null; hasMore: boolean } }>
  readDocumentRevision: (payload: { path: string; commitSha: string; pathAtRevision: string }) => Promise<{ ok: true; data: { path: string; commitSha: string; content: string } }>
  loadDocumentRevision: (payload: { path: string; commitSha: string; pathAtRevision: string }) => Promise<{ ok: true; data: { path: string; commitSha: string; restoredImagePaths: string[] } }>
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
    validateProjectFolder: async () => ({ ok: true, data: { valid: false } }),
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
    gitHistoryStatus: async () => ({ ok: true, data: { gitAvailable: false, repositoryRoot: null, usesParentRepository: false, needsInitialization: false } }),
    saveGitSnapshot: async () => ({ ok: true, data: { kind: 'saved', repositoryRoot: 'C:/tmp/project/.git', createdRepository: false, message: 'Snapshot saved.' } }),
    listDocumentRevisions: async (payload) => ({ ok: true, data: { gitAvailable: true, repositoryRoot: 'C:/tmp/project/.git', current: { path: payload.path, hasRepository: true, isTracked: true }, revisions: [], cursor: null, hasMore: false } }),
    readDocumentRevision: async (payload) => ({ ok: true, data: { path: payload.path, commitSha: payload.commitSha, content: '# Revision' } }),
    loadDocumentRevision: async (payload) => ({ ok: true, data: { path: payload.path, commitSha: payload.commitSha, restoredImagePaths: [] } }),
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
      zoomLevel: 1,
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
    window.localStorage.removeItem(LAST_PROJECT_STORAGE_KEY)
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
      zoomLevel: 1,
    })
  })

  it('persists last successful project root after opening a project', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    window.localStorage.removeItem(LAST_PROJECT_STORAGE_KEY)
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async () => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md'],
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
      await Promise.resolve()
    })

    expect(window.localStorage.getItem(LAST_PROJECT_STORAGE_KEY)).toBe('C:/tmp/project')
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
      await model?.actions.createArticle({ directory: '', name: 'New-Article', sourceImagePath: '' })
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

  it('markEditorDirty flips dirty once without mutating content on repeated calls', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async () => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: '# A', meta: {} } }),
    })

    let model: ProjectEditorModel | undefined
    let renderCount = 0

    function Harness() {
      renderCount += 1
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

    const renderCountAfterLoad = renderCount
    expect(model?.state.editorValue).toBe('# A')
    expect(model?.state.isDirty).toBe(false)

    act(() => {
      model?.actions.markEditorDirty()
    })

    expect(model?.state.editorValue).toBe('# A')
    expect(model?.state.isDirty).toBe(true)
    expect(renderCount).toBe(renderCountAfterLoad + 1)

    const renderCountAfterFirstDirty = renderCount
    act(() => {
      model?.actions.markEditorDirty()
      model?.actions.markEditorDirty()
    })

    expect(model?.state.editorValue).toBe('# A')
    expect(model?.state.isDirty).toBe(true)
    expect(renderCount).toBe(renderCountAfterFirstDirty)
  })

  it('keeps unrelated actions callable during editor dirty and content updates', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async () => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md'],
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

    act(() => {
      model?.actions.markEditorDirty()
    })

    expect(typeof model?.actions.toggleFocusMode).toBe('function')
    expect(typeof model?.actions.resolveConflictKeep).toBe('function')
    expect(typeof model?.actions.setSidebarSection).toBe('function')

    act(() => {
      model?.actions.updateEditorValue('# A changed')
    })

    expect(typeof model?.actions.toggleFocusMode).toBe('function')
    expect(typeof model?.actions.resolveConflictKeep).toBe('function')
    expect(typeof model?.actions.setSidebarSection).toBe('function')
  })

  it('navigates pane history with Alt+Left and Alt+Right without mutating the stack', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async (_payload) => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: `# ${payload.path}`, meta: {} } }),
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
      await Promise.resolve()
    })

    await act(async () => {
      await model?.actions.selectFile('docs/b.md')
      await model?.actions.selectFile('docs/c.md')
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/c.md')

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', altKey: true, bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/b.md')

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', altKey: true, bubbles: true }))
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/c.md')
  })

  it('opens previous and next documents from pane history actions', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async (_payload) => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: `# ${payload.path}`, meta: {} } }),
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
      await model?.actions.selectFile('docs/b.md')
      await model?.actions.selectFile('docs/c.md')
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/c.md')

    await act(async () => {
      await model?.actions.openPreviousInPaneHistory()
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/b.md')

    await act(async () => {
      await model?.actions.openNextInPaneHistory()
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/c.md')
  })

  it('seeds initial pane history from persisted split layout on project open', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.setItem(
      WORKSPACE_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        mode: 'split',
        ratio: 0.56,
        primaryPath: 'docs/a.md',
        secondaryPath: 'docs/b.md',
        activePane: 'secondary',
        focusModeEnabled: false,
        focusScope: 'paragraph',
        zoomLevel: 1,
      }),
    )
    setupTramaApiMock({
      selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
      openProject: async () => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['docs/a.md', 'docs/b.md', 'docs/c.md', 'docs/d.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: `# ${payload.path}`, meta: {} } }),
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

    expect(model?.state.workspaceLayout.activePane).toBe('secondary')
    expect(model?.state.selectedPath).toBe('docs/b.md')

    await act(async () => {
      await model?.actions.openFileInPane('docs/c.md', 'secondary')
      await model?.actions.openFileInPane('docs/d.md', 'secondary')
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/d.md')

    await act(async () => {
      await model?.actions.openPreviousInPaneHistory('secondary')
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/c.md')

    await act(async () => {
      await model?.actions.openPreviousInPaneHistory('secondary')
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/b.md')

    await act(async () => {
      await model?.actions.openFileInPane('docs/c.md', 'primary')
      await model?.actions.openFileInPane('docs/d.md', 'primary')
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.activePane).toBe('primary')
    expect(model?.state.selectedPath).toBe('docs/d.md')

    await act(async () => {
      await model?.actions.openPreviousInPaneHistory('primary')
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/c.md')

    await act(async () => {
      await model?.actions.openPreviousInPaneHistory('primary')
      await Promise.resolve()
    })

    expect(model?.state.selectedPath).toBe('docs/a.md')
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

  it('loads revisions for the requested file when switching revision targets', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    const listDocumentRevisions = async (payload: { path: string; cursor?: string | null }) => ({
      ok: true as const,
      data: {
        gitAvailable: true,
        repositoryRoot: 'C:/tmp/project/.git',
        current: { path: payload.path, hasRepository: true, isTracked: true },
        revisions: [{
          sha: `sha-for-${payload.path}`,
          committedAt: '2026-05-28T10:00:00.000Z',
          commitMessage: 'snapshot',
          pathAtRevision: payload.path,
        }],
        cursor: null,
        hasMore: false,
      },
    })
    setupTramaApiMock({
      gitHistoryStatus: async () => ({ ok: true, data: { gitAvailable: true, repositoryRoot: 'C:/tmp/project/.git', usesParentRepository: false, needsInitialization: false } }),
      openProject: async (_payload) => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['book/a.md', 'book/b.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: `# ${payload.path}`, meta: {} } }),
      listDocumentRevisions,
      readDocumentRevision: async (payload) => ({ ok: true, data: { path: payload.path, commitSha: payload.commitSha, content: `# revision ${payload.path}` } }),
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
      await Promise.resolve()
      await model?.actions.toggleDocumentRevisions('book/a.md', 'primary')
      await model?.actions.toggleDocumentRevisions('book/b.md', 'primary')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(model?.state.primaryPane.revisionRail.documentPath).toBe('book/b.md')
  })

  it('clears the previous revision target when selecting another file before reopening revisions', async () => {
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    const listDocumentRevisions = vi.fn(async (payload: { path: string; cursor?: string | null }) => ({
      ok: true as const,
      data: {
        gitAvailable: true,
        repositoryRoot: 'C:/tmp/project/.git',
        current: { path: payload.path, hasRepository: true, isTracked: true },
        revisions: [{
          sha: `sha-for-${payload.path}`,
          committedAt: '2026-05-28T10:00:00.000Z',
          commitMessage: 'snapshot',
          pathAtRevision: payload.path,
        }],
        cursor: null,
        hasMore: false,
      },
    }))
    setupTramaApiMock({
      gitHistoryStatus: async () => ({ ok: true, data: { gitAvailable: true, repositoryRoot: 'C:/tmp/project/.git', usesParentRepository: false, needsInitialization: false } }),
      openProject: async () => ({
        ok: true,
        data: {
          rootPath: 'C:/tmp/project',
          tree: [],
          markdownFiles: ['book/a.md', 'book/b.md'],
          index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
        },
      }),
      readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: `# ${payload.path}`, meta: {} } }),
      listDocumentRevisions,
      readDocumentRevision: async (payload) => ({ ok: true, data: { path: payload.path, commitSha: payload.commitSha, content: `# revision ${payload.path}` } }),
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
      await model?.actions.toggleDocumentRevisions('book/a.md', 'primary')
      await Promise.resolve()
    })

    expect(model?.state.primaryPane.revisionRail.open).toBe(true)
    expect(model?.state.primaryPane.revisionRail.documentPath).toBe('book/a.md')

    await act(async () => {
      await model?.actions.selectFile('book/b.md')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(model?.state.primaryPane.revisionRail.open).toBe(false)
    expect(model?.state.primaryPane.revisionRail.documentPath).toBe(null)

    await act(async () => {
      await model?.actions.toggleDocumentRevisions('book/b.md', 'primary')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(model?.state.primaryPane.revisionRail.documentPath).toBe('book/b.md')
    expect(listDocumentRevisions).toHaveBeenLastCalledWith({ path: 'book/b.md', cursor: null })
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

  it('expands collapsed sidebar when clicking a rail section', async () => {
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
    expect(model?.state.sidebarActiveSection).toBe('explorer')

    await act(async () => {
      model?.actions.toggleSidebarPanelCollapsed()
      await Promise.resolve()
    })

    expect(model?.state.sidebarPanelCollapsed).toBe(true)

    await act(async () => {
      model?.actions.setSidebarSection('lore')
      await Promise.resolve()
    })

    expect(model?.state.sidebarActiveSection).toBe('lore')
    expect(model?.state.sidebarPanelCollapsed).toBe(false)
  })

  it('does not expand sidebar when clicking rail section while focus mode is active', async () => {
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

    await act(async () => {
      model?.actions.toggleFocusMode()
      await Promise.resolve()
    })

    expect(model?.state.workspaceLayout.focusModeEnabled).toBe(true)
    expect(model?.state.sidebarPanelCollapsed).toBe(true)

    await act(async () => {
      model?.actions.setSidebarSection('settings')
      await Promise.resolve()
    })

    expect(model?.state.sidebarActiveSection).toBe('settings')
    expect(model?.state.sidebarPanelCollapsed).toBe(true)
  })

  it('does not expand sidebar when clicking same rail section while collapsed', async () => {
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

    expect(model?.state.sidebarActiveSection).toBe('explorer')

    await act(async () => {
      model?.actions.toggleSidebarPanelCollapsed()
      await Promise.resolve()
    })

    expect(model?.state.sidebarPanelCollapsed).toBe(true)

    await act(async () => {
      model?.actions.setSidebarSection('outline')
      await Promise.resolve()
    })

    expect(model?.state.sidebarActiveSection).toBe('outline')
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
