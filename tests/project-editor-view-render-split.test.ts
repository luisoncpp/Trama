import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { describe, expect, it, vi } from 'vitest'
import * as aiImportDialogModule from '../src/features/project-editor/components/ai-import-dialog'
import * as aiExportDialogModule from '../src/features/project-editor/components/ai-export-dialog'
import * as bookExportDialogModule from '../src/features/project-editor/components/book-export-dialog'
import * as sidebarPanelModule from '../src/features/project-editor/components/sidebar/sidebar-panel.tsx'
import * as zuluImportDialogModule from '../src/features/project-editor/components/zulu-import-dialog'
import { ProjectEditorView } from '../src/features/project-editor/project-editor-view'
import { useProjectEditor } from '../src/features/project-editor/use-project-editor'
import type { ProjectEditorModel } from '../src/features/project-editor/project-editor-types'
import { WORKSPACE_LAYOUT_STORAGE_KEY } from '../src/features/project-editor/project-editor-logic'

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
  createDocument: (payload: { path: string; initialContent?: string }) => Promise<{ ok: true; data: { path: string; createdAt: string } }>
  createFolder: (payload: { path: string }) => Promise<{ ok: true; data: { path: string; createdAt: string } }>
  renameDocument: (payload: { path: string; newName: string }) => Promise<{ ok: true; data: { path: string; renamedTo: string; updatedAt: string } }>
  deleteDocument: (payload: { path: string }) => Promise<{ ok: true; data: { path: string; deletedAt: string } }>
  getIndex: () => Promise<{ ok: true; data: { version: string; corkboardOrder: Record<string, string[]>; cache: Record<string, unknown> } }>
  onExternalFileEvent: () => () => void
  setFullscreen: (payload: { enabled: boolean }) => Promise<{ ok: true; data: { enabled: boolean } }>
  onFullscreenChanged: (callback: (event: { enabled: boolean }) => void) => () => void
}

function setupTramaApiMock(overrides?: Partial<TramaApiMock>) {
  const baseApi: TramaApiMock = {
    ping: async () => ({ ok: true, data: { echo: 'ok', timestamp: new Date().toISOString() } }),
    openProject: async () => ({
      ok: true,
      data: {
        rootPath: 'C:/tmp/project',
        tree: [],
        markdownFiles: ['docs/a.md'],
        index: { version: '1.0.0', corkboardOrder: {}, cache: {} },
      },
    }),
    selectProjectFolder: async () => ({ ok: true, data: { rootPath: 'C:/tmp/project' } }),
    readDocument: async (payload) => ({ ok: true, data: { path: payload.path, content: '# A', meta: {} } }),
    saveDocument: async (payload) => ({ ok: true, data: { path: payload.path, version: new Date().toISOString() } }),
    createDocument: async (payload) => ({ ok: true, data: { path: payload.path, createdAt: new Date().toISOString() } }),
    createFolder: async (payload) => ({ ok: true, data: { path: payload.path, createdAt: new Date().toISOString() } }),
    renameDocument: async (payload) => ({ ok: true, data: { path: payload.path, renamedTo: payload.newName, updatedAt: new Date().toISOString() } }),
    deleteDocument: async (payload) => ({ ok: true, data: { path: payload.path, deletedAt: new Date().toISOString() } }),
    getIndex: async () => ({ ok: true, data: { version: '1.0.0', corkboardOrder: {}, cache: {} } }),
    onExternalFileEvent: () => () => undefined,
    setFullscreen: async (payload) => ({ ok: true, data: { enabled: payload.enabled } }),
    onFullscreenChanged: () => () => undefined,
  }

  ;(window as unknown as { tramaApi: TramaApiMock }).tramaApi = {
    ...baseApi,
    ...overrides,
  }
}

describe('ProjectEditorView shell split', () => {
  it('does not re-render sidebar or dialogs when typing updates only editor state', async () => {
    window.localStorage.removeItem('trama.sidebar.ui.v1')
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    setupTramaApiMock()

    let sidebarRenderCount = 0
    let aiImportRenderCount = 0
    let aiExportRenderCount = 0
    let bookExportRenderCount = 0
    let zuluImportRenderCount = 0
    const handleThemePreferenceChange = () => undefined
    const handleSpellcheckEnabledChange = () => undefined
    const handleSpellcheckLanguageChange = () => undefined
    const spellcheckLanguageOptions: string[] = []

    const sidebarSpy = vi.spyOn(sidebarPanelModule, 'SidebarPanel').mockImplementation((props) => {
      sidebarRenderCount += 1
      return h('div', { 'data-testid': 'sidebar-shell-probe', 'data-selected-path': props.selectedPath ?? '' })
    })
    const aiImportSpy = vi.spyOn(aiImportDialogModule, 'AiImportDialog').mockImplementation(() => {
      aiImportRenderCount += 1
      return null
    })
    const aiExportSpy = vi.spyOn(aiExportDialogModule, 'AiExportDialog').mockImplementation(() => {
      aiExportRenderCount += 1
      return null
    })
    const bookExportSpy = vi.spyOn(bookExportDialogModule, 'BookExportDialog').mockImplementation(() => {
      bookExportRenderCount += 1
      return null
    })
    const zuluImportSpy = vi.spyOn(zuluImportDialogModule, 'ZuluImportDialog').mockImplementation(() => {
      zuluImportRenderCount += 1
      return null
    })

    let model: ProjectEditorModel | undefined

    function Harness() {
      model = useProjectEditor()
      return h(ProjectEditorView, {
        model: model as ProjectEditorModel,
        themePreference: 'dark',
        resolvedTheme: 'dark',
        onThemePreferenceChange: handleThemePreferenceChange,
        spellcheckEnabled: true,
        spellcheckLanguage: null,
        spellcheckLanguageOptions,
        spellcheckLanguageSelectionSupported: false,
        onSpellcheckEnabledChange: handleSpellcheckEnabledChange,
        onSpellcheckLanguageChange: handleSpellcheckLanguageChange,
      })
    }

    const container = document.createElement('div')
    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      await model?.actions.pickProjectFolder()
    })

    const shellSidebarRenderCount = sidebarRenderCount
    const shellAiImportRenderCount = aiImportRenderCount
    const shellAiExportRenderCount = aiExportRenderCount
    const shellBookExportRenderCount = bookExportRenderCount
    const shellZuluImportRenderCount = zuluImportRenderCount

    act(() => {
      model?.actions.markEditorDirty()
      model?.actions.updateEditorValue('# A changed')
    })

    expect(sidebarRenderCount).toBe(shellSidebarRenderCount)
    expect(aiImportRenderCount).toBe(shellAiImportRenderCount)
    expect(aiExportRenderCount).toBe(shellAiExportRenderCount)
    expect(bookExportRenderCount).toBe(shellBookExportRenderCount)
    expect(zuluImportRenderCount).toBe(shellZuluImportRenderCount)

    sidebarSpy.mockRestore()
    aiImportSpy.mockRestore()
    aiExportSpy.mockRestore()
    bookExportSpy.mockRestore()
    zuluImportSpy.mockRestore()
  })
})
