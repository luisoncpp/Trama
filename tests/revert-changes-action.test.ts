import { describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { revertChanges } from '../src/features/project-editor/workspace-actions'
import { usePaneWorkspace, type PaneBindings } from '../src/features/project-editor/pane'
import type { EditorSerializationRefs, PaneDocumentState, WorkspaceLayoutState, ProjectEditorUiState } from '../src/features/project-editor/project-editor-types'

interface TestSetters {
  setExternalConflictPath: (value: string | null) => void
  setConflictComparisonContent: (value: string | null) => void
}

function makeUiState(externalConflictPath: string | null = null): ProjectEditorUiState {
  return {
    apiAvailable: true,
    loadingProject: false,
    loadingDocument: false,
    saving: false,
    isFullscreen: false,
    externalConflictPath,
    conflictComparisonContent: null,
    statusMessage: '',
  }
}

function makeLayout(activePane: 'primary' | 'secondary', primaryPath: string | null = 'docs/a.md', secondaryPath: string | null = 'docs/b.md'): WorkspaceLayoutState {
  return {
    mode: 'split',
    ratio: 0.5,
    primaryPath,
    secondaryPath,
    activePane,
    focusModeEnabled: false,
    focusScope: 'paragraph',
    zoomLevel: 1,
  }
}

function makePane(path: string | null, content: string, isDirty: boolean): PaneDocumentState {
  return { path, content, meta: {}, isDirty, reloadVersion: 0 }
}

function makeSerializationRefs(): { primary: { current: EditorSerializationRefs }; secondary: { current: EditorSerializationRefs } } {
  return {
    primary: { current: { flush: () => null, tagOverlayRecalcRef: { current: false }, tagOverlayMatchesRef: { current: [] } } },
    secondary: { current: { flush: () => null, tagOverlayRecalcRef: { current: false }, tagOverlayMatchesRef: { current: [] } } },
  }
}

const noopSaveDocumentFn = () => Promise.resolve()
const navigationHistory = {
  primary: { entries: [], index: -1 },
  secondary: { entries: [], index: -1 },
}

function makePaneBindings(primary: PaneDocumentState, secondary: PaneDocumentState): PaneBindings {
  return {
    primaryPane: primary,
    secondaryPane: secondary,
    setPrimaryPane: () => {},
    setSecondaryPane: () => {},
  }
}

describe('revertChanges', () => {
  it('calls loadDocument when pane is dirty and has a path', () => {
    const layout = makeLayout('primary')
    const primary = makePane('docs/a.md', '# dirty content', true)
    const secondary = makePane('docs/b.md', '# B', false)
    const paneBindings = makePaneBindings(primary, secondary)
    const serializationRefs = makeSerializationRefs()
    const setters: TestSetters = {
      setExternalConflictPath: vi.fn(),
      setConflictComparisonContent: vi.fn(),
    }
    const uiState = makeUiState()

    const loadDocument = vi.fn().mockResolvedValue(undefined)
    let wsRef: ReturnType<typeof usePaneWorkspace> | null = null

    function Harness() {
      wsRef = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn, navigationHistory)
      return null
    }

    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })

    act(() => {
      revertChanges(undefined, {
        workspace: wsRef!,
        loadDocument,
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        uiState,
      })
    })

    expect(loadDocument).toHaveBeenCalledTimes(1)
    expect(loadDocument).toHaveBeenCalledWith('docs/a.md', 'primary')
  })

  it('does not call loadDocument when pane is not dirty', () => {
    const layout = makeLayout('primary')
    const primary = makePane('docs/a.md', '# clean content', false)
    const secondary = makePane('docs/b.md', '# B', false)
    const paneBindings = makePaneBindings(primary, secondary)
    const serializationRefs = makeSerializationRefs()
    const setters: TestSetters = {
      setExternalConflictPath: vi.fn(),
      setConflictComparisonContent: vi.fn(),
    }
    const uiState = makeUiState()

    const loadDocument = vi.fn().mockResolvedValue(undefined)
    let wsRef: ReturnType<typeof usePaneWorkspace> | null = null

    function Harness() {
      wsRef = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn, navigationHistory)
      return null
    }

    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })

    act(() => {
      revertChanges(undefined, {
        workspace: wsRef!,
        loadDocument,
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        uiState,
      })
    })

    expect(loadDocument).not.toHaveBeenCalled()
  })

  it('does not call loadDocument when pane has no path', () => {
    const layout = makeLayout('primary')
    const primary = makePane(null, '# no path', true)
    const secondary = makePane('docs/b.md', '# B', false)
    const paneBindings = makePaneBindings(primary, secondary)
    const serializationRefs = makeSerializationRefs()
    const setters: TestSetters = {
      setExternalConflictPath: vi.fn(),
      setConflictComparisonContent: vi.fn(),
    }
    const uiState = makeUiState()

    const loadDocument = vi.fn().mockResolvedValue(undefined)
    let wsRef: ReturnType<typeof usePaneWorkspace> | null = null

    function Harness() {
      wsRef = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn, navigationHistory)
      return null
    }

    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })

    act(() => {
      revertChanges(undefined, {
        workspace: wsRef!,
        loadDocument,
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        uiState,
      })
    })

    expect(loadDocument).not.toHaveBeenCalled()
  })

  it('uses explicit pane when provided', () => {
    const layout = makeLayout('primary')
    const primary = makePane('docs/a.md', '# A clean', false)
    const secondary = makePane('docs/b.md', '# B dirty', true)
    const paneBindings = makePaneBindings(primary, secondary)
    const serializationRefs = makeSerializationRefs()
    const setters: TestSetters = {
      setExternalConflictPath: vi.fn(),
      setConflictComparisonContent: vi.fn(),
    }
    const uiState = makeUiState()

    const loadDocument = vi.fn().mockResolvedValue(undefined)
    let wsRef: ReturnType<typeof usePaneWorkspace> | null = null

    function Harness() {
      wsRef = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn, navigationHistory)
      return null
    }

    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })

    act(() => {
      revertChanges('secondary', {
        workspace: wsRef!,
        loadDocument,
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        uiState,
      })
    })

    expect(loadDocument).toHaveBeenCalledTimes(1)
    expect(loadDocument).toHaveBeenCalledWith('docs/b.md', 'secondary')
  })

  it('flushes pending editor content before reloading from disk', () => {
    const layout = makeLayout('primary')
    const primary = makePane('docs/a.md', '# clean content', true)
    const secondary = makePane('docs/b.md', '# B', false)
    const paneBindings = makePaneBindings(primary, secondary)
    const serializationRefs = makeSerializationRefs()
    const flushSpy = vi.fn(() => '# unsaved content')
    serializationRefs.primary.current.flush = flushSpy
    const setters: TestSetters = {
      setExternalConflictPath: vi.fn(),
      setConflictComparisonContent: vi.fn(),
    }
    const uiState = makeUiState()

    const loadDocument = vi.fn().mockResolvedValue(undefined)
    let wsRef: ReturnType<typeof usePaneWorkspace> | null = null

    function Harness() {
      wsRef = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn, navigationHistory)
      return null
    }

    const container = document.createElement('div')
    act(() => { render(h(Harness, {}), container) })

    act(() => {
      revertChanges(undefined, {
        workspace: wsRef!,
        loadDocument,
        setExternalConflictPath: setters.setExternalConflictPath,
        setConflictComparisonContent: setters.setConflictComparisonContent,
        uiState,
      })
    })

    expect(flushSpy).toHaveBeenCalledTimes(1)
    expect(loadDocument).toHaveBeenCalledWith('docs/a.md', 'primary')
  })
})
