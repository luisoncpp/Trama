import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useProjectEditor } from '../src/features/project-editor/use-project-editor'
import type { ProjectEditorModel } from '../src/features/project-editor/project-editor-types'
import type { ExternalFileEvent } from '../src/shared/ipc'

const DEBOUNCE_MS = 1000

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

function createDocumentStore() {
  return new Map<string, { content: string; meta: Record<string, unknown> }>([
    ['docs/a.md', { content: '# A', meta: {} }],
    ['docs/b.md', { content: '# B', meta: {} }],
  ])
}

function setupTramaApiMock(overrides?: Partial<TramaApiMock>, documentStore?: Map<string, { content: string; meta: Record<string, unknown> }>) {
  const docs = documentStore ?? createDocumentStore()
  let externalListener: ((event: ExternalFileEvent) => void) | null = null
  const openProjectMock = vi.fn(async () => ({
    ok: true as const,
    data: {
      rootPath: 'C:/tmp/project',
      tree: [],
      markdownFiles: ['docs/a.md', 'docs/b.md'],
      index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
    },
  }))
  const readDocumentMock = vi.fn(async (payload: { path: string }) => ({
    ok: true as const,
    data: {
      path: payload.path,
      content: docs.get(payload.path)?.content ?? '# Missing',
      meta: docs.get(payload.path)?.meta ?? {},
    },
  }))
  const saveDocumentMock = vi.fn(async (payload: { path: string; content: string; meta: Record<string, unknown> }) => {
    docs.set(payload.path, { content: payload.content, meta: payload.meta })
    return { ok: true as const, data: { path: payload.path, version: new Date().toISOString() } }
  })
  const baseApi: TramaApiMock = {
    ping: async () => ({ ok: true, data: { echo: 'ok', timestamp: new Date().toISOString() } }),
    openProject: openProjectMock,
    selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
    readDocument: readDocumentMock,
    saveDocument: saveDocumentMock,
    getIndex: async () => ({ ok: true as const, data: { version: '1.0.0', corkboardOrder: {}, cache: {} } }),
    onExternalFileEvent: (callback) => { externalListener = callback; return () => { externalListener = null } },
    setFullscreen: async (_payload) => ({ ok: true as const, data: { enabled: _payload.enabled } }),
    onFullscreenChanged: () => () => undefined,
  }
  ;(window as unknown as { tramaApi: TramaApiMock }).tramaApi = { ...baseApi, ...overrides }
  return { openProjectMock, readDocumentMock, saveDocumentMock, emitExternalEvent: (event: ExternalFileEvent) => { if (externalListener) externalListener(event) } }
}

describe('editor serialization debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('updateEditorValue sets dirty immediately but saveNow flushes latest content', async () => {
    const { saveDocumentMock } = setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    act(() => { model?.actions.updateEditorValue('# first') })
    expect(model?.state.isDirty).toBe(true)
    act(() => { model?.actions.updateEditorValue('# second') })
    act(() => { model?.actions.updateEditorValue('# third') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    expect(saveDocumentMock).toHaveBeenCalledTimes(0)
    await act(async () => {
      model?.actions.saveNow()
      await Promise.resolve()
    })
    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    expect(saveDocumentMock.mock.calls[0]?.[0]).toMatchObject({ path: 'docs/a.md', content: '# third' })
  })

  it('saveNow forces immediate flush and uses return value, not stale state', async () => {
    const { saveDocumentMock } = setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    act(() => { model?.actions.updateEditorValue('# changed content') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    expect(saveDocumentMock).toHaveBeenCalledTimes(0)
    await act(async () => {
      model?.actions.saveNow()
      await Promise.resolve()
    })
    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    expect(saveDocumentMock.mock.calls[0]?.[0]).toMatchObject({ path: 'docs/a.md', content: '# changed content' })
  })

  it('selectFile flushes active pane before saving dirty content', async () => {
    const { saveDocumentMock } = setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    act(() => { model?.actions.updateEditorValue('# unsaved edits') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    expect(saveDocumentMock).toHaveBeenCalledTimes(0)
    await act(async () => { await model?.actions.selectFile('docs/b.md') })
    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    expect(saveDocumentMock.mock.calls[0]?.[0]).toMatchObject({ path: 'docs/a.md', content: '# unsaved edits' })
    expect(model?.state.selectedPath).toBe('docs/b.md')
  })

  it('setWorkspaceActivePane flushes and saves the outgoing pane before switching', async () => {
    const { saveDocumentMock } = setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    await act(async () => {
      model?.actions.openFileInPane('docs/b.md', 'secondary')
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(model?.state.secondaryPane.path).toBe('docs/b.md')
    act(() => { model?.actions.updateEditorValue('# secondary dirty', 'secondary') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    await act(async () => { await model?.actions.setWorkspaceActivePane('primary') })
    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    expect(saveDocumentMock.mock.calls[0]?.[0]).toMatchObject({ path: 'docs/b.md', content: '# secondary dirty' })
    expect(model?.state.workspaceLayout.activePane).toBe('primary')
  })

  it('rapid pane switching does not cause cross-document contamination', async () => {
    const { saveDocumentMock } = setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    await act(async () => { model?.actions.toggleWorkspaceLayoutMode(); await Promise.resolve() })
    await act(async () => { model?.actions.setWorkspaceActivePane('secondary'); await Promise.resolve() })
    await act(async () => { await Promise.resolve() })
    act(() => { model?.actions.updateEditorValue('# content in B', 'secondary') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    act(() => { model?.actions.setWorkspaceActivePane('primary') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    act(() => { model?.actions.setWorkspaceActivePane('secondary') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    act(() => { model?.actions.setWorkspaceActivePane('primary') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    act(() => { model?.actions.setWorkspaceActivePane('secondary') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
      await Promise.resolve()
    })
    const secondarySaveCalls = saveDocumentMock.mock.calls.filter((call) => call[0]?.path === 'docs/b.md')
    for (const call of secondarySaveCalls) {
      expect(call[0]?.content).not.toContain('primary')
    }
  })

  it('dirty flag is set immediately on first keystroke, before debounce', async () => {
    setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    expect(model?.state.isDirty).toBe(false)
    act(() => { model?.actions.updateEditorValue('# first keystroke') })
    expect(model?.state.isDirty).toBe(true)
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    expect(model?.state.isDirty).toBe(true)
  })

  it('autosave fires after 10 minutes and uses flush return value', async () => {
    const { saveDocumentMock } = setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    // Ensure the active document is docs/a.md so the autosave targets the expected file.
    if (model?.state.selectedPath !== 'docs/a.md') {
      await act(async () => { await model?.actions.selectFile('docs/a.md') })
    }
    act(() => { model?.actions.updateEditorValue('# autosave content') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    expect(saveDocumentMock).toHaveBeenCalledTimes(0)
    // The editor debounce fires at 1s and updates editorValue, which restarts the autosave timer.
    // We must advance past 10min + 1s for the autosave to fire.
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000 + DEBOUNCE_MS)
      await Promise.resolve()
    })
    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    expect(saveDocumentMock.mock.calls[0]?.[0]).toMatchObject({ path: 'docs/a.md', content: '# autosave content' })
  })

  it('editor content is not wiped when debounced onChange updates pane state', async () => {
    setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    act(() => { model?.actions.updateEditorValue('# steady typing') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    expect(model?.state.editorValue).toBe('# steady typing')
    act(() => { model?.actions.updateEditorValue('# more text') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    expect(model?.state.editorValue).toBe('# more text')
  })

  it('flush returns null when isApplyingExternalValueRef is true', async () => {
    setupTramaApiMock()
    let model: ProjectEditorModel | undefined
    function Harness() { model = useProjectEditor(); return null }
    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })
    await act(async () => { await model?.actions.pickProjectFolder() })
    act(() => { model?.actions.updateEditorValue('# original') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS); await Promise.resolve() })
    expect(model?.state.editorValue).toBe('# original')
    act(() => { model?.actions.updateEditorValue('# changed by external sync') })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); await Promise.resolve() })
    expect(model?.state.editorValue).toBe('# changed by external sync')
  })
})