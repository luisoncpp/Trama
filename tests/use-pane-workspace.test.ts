import { describe, expect, it } from 'vitest'
console.log('LOG: use-pane-workspace test cargado')
import { h, render } from 'preact'
import { useMemo } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { usePaneWorkspace, type PaneBindings } from '../src/features/project-editor/pane'
import type { EditorSerializationRefs, PaneDocumentState, WorkspaceLayoutState } from '../src/features/project-editor/project-editor-types'

function makeLayout(activePane: 'primary' | 'secondary', primaryPath: string | null = 'docs/a.md', secondaryPath: string | null = 'docs/b.md'): WorkspaceLayoutState {
  return {
    mode: 'split',
    ratio: 0.5,
    primaryPath,
    secondaryPath,
    activePane,
    focusModeEnabled: false,
    focusScope: 'paragraph',
  }
}

function makePane(path: string | null, content: string, isDirty: boolean): PaneDocumentState {
  return { path, content, meta: {}, isDirty }
}

function makeSerializationRefs(): { primary: { current: EditorSerializationRefs }, secondary: { current: EditorSerializationRefs } } {
  return {
    primary: {
      current: {
        flush: () => null,
        tagOverlayRecalcRef: { current: false },
        tagOverlayMatchesRef: { current: [] },
      },
    },
    secondary: {
      current: {
        flush: () => null,
        tagOverlayRecalcRef: { current: false },
        tagOverlayMatchesRef: { current: [] },
      },
    },
  }
}

const noopSaveDocumentFn = () => Promise.resolve()

function makePaneBindings(primary: PaneDocumentState, secondary: PaneDocumentState): PaneBindings {
  return {
    primaryPane: primary,
    secondaryPane: secondary,
    setPrimaryPane: () => {},
    setSecondaryPane: () => {},
  }
}

describe('usePaneWorkspace', () => {
  it('creates a PaneWorkspace with the given inputs', () => {
    let workspaceRef: any = null
    const layout = makeLayout('primary')
    const primary = makePane('docs/a.md', '# A', false)
    const secondary = makePane('docs/b.md', '# B', false)
    const paneBindings = makePaneBindings(primary, secondary)
    const serializationRefs = makeSerializationRefs()

    function Harness() {
      const ws = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn)
      workspaceRef = ws
      return null
    }

    const container = document.createElement('div')
    act(() => {
      render(h(Harness, {}), container)
    })

    expect(workspaceRef).toBeDefined()
    expect(workspaceRef.layout).toEqual(layout)
    expect(Object.isFrozen(workspaceRef.layout)).toBe(true)
    expect(workspaceRef.primary).toEqual(primary)
    expect(Object.isFrozen(workspaceRef.primary)).toBe(true)
    expect(workspaceRef.secondary).toEqual(secondary)
    expect(Object.isFrozen(workspaceRef.secondary)).toBe(true)
  })

  it('memoizes workspace across re-renders when layout changes', () => {
    let firstInstance: any = null
    let secondInstance: any = null
    const primary = makePane('docs/a.md', '# A', false)
    const secondary = makePane('docs/b.md', '# B', false)
    const paneBindings = makePaneBindings(primary, secondary)
    const serializationRefs = makeSerializationRefs()

    function Harness({ layout }: { layout: WorkspaceLayoutState }) {
      const ws = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn)
      if (!firstInstance) firstInstance = ws
      else secondInstance = ws
      return null
    }

    const container = document.createElement('div')
    const layout1 = makeLayout('primary')
    const layout2 = makeLayout('secondary')

    act(() => {
      render(h(Harness, { layout: layout1 }), container)
    })
    act(() => {
      render(h(Harness, { layout: layout2 }), container)
    })

    expect(secondInstance).not.toBe(firstInstance)
    expect(secondInstance.layout.activePane).toBe('secondary')
    expect(firstInstance.layout.activePane).toBe('primary')
  })

  it('memoizes workspace across re-renders when primary pane changes', () => {
    let firstInstance: any = null
    let secondInstance: any = null
    const layout = makeLayout('primary')
    const secondary = makePane('docs/b.md', '# B', false)
    const serializationRefs = makeSerializationRefs()

    function Harness({ primary }: { primary: PaneDocumentState }) {
      const paneBindings = useMemo(() => makePaneBindings(primary, secondary), [primary, secondary])
      const ws = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn)
      if (!firstInstance) firstInstance = ws
      else secondInstance = ws
      return null
    }

    const container = document.createElement('div')
    const primary1 = makePane('docs/a.md', '# A', false)
    const primary2 = makePane('docs/a.md', '# A modified', true)

    act(() => {
      render(h(Harness, { primary: primary1 }), container)
    })
    act(() => {
      render(h(Harness, { primary: primary2 }), container)
    })

    expect(secondInstance).not.toBe(firstInstance)
    expect(secondInstance.primary.isDirty).toBe(true)
    expect(firstInstance.primary.isDirty).toBe(false)
  })

  it('memoizes workspace across re-renders when secondary pane changes', () => {
    let firstInstance: any = null
    let secondInstance: any = null
    const layout = makeLayout('primary')
    const primary = makePane('docs/a.md', '# A', false)
    const serializationRefs = makeSerializationRefs()

    function Harness({ secondary }: { secondary: PaneDocumentState }) {
      const paneBindings = useMemo(() => makePaneBindings(primary, secondary), [primary, secondary])
      const ws = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn)
      if (!firstInstance) firstInstance = ws
      else secondInstance = ws
      return null
    }

    const container = document.createElement('div')
    const secondary1 = makePane('docs/b.md', '# B', false)
    const secondary2 = makePane('docs/b.md', '# B modified', true)

    act(() => {
      render(h(Harness, { secondary: secondary1 }), container)
    })
    act(() => {
      render(h(Harness, { secondary: secondary2 }), container)
    })

    expect(secondInstance).not.toBe(firstInstance)
    expect(secondInstance.secondary.isDirty).toBe(true)
    expect(firstInstance.secondary.isDirty).toBe(false)
  })

  it('returns same instance when inputs do not change across re-renders', () => {
    let firstInstance: any = null
    let secondInstance: any = null
    let renderCount = 0
    const layout = makeLayout('primary')
    const primary = makePane('docs/a.md', '# A', false)
    const secondary = makePane('docs/b.md', '# B', false)
    const paneBindings = makePaneBindings(primary, secondary)
    const serializationRefs = makeSerializationRefs()

    function Harness() {
      renderCount++
      const ws = usePaneWorkspace(layout, paneBindings, serializationRefs, noopSaveDocumentFn)
      if (renderCount === 1) firstInstance = ws
      else secondInstance = ws
      return null
    }

    const container = document.createElement('div')
    act(() => {
      render(h(Harness, {}), container)
    })
    act(() => {
      render(h(Harness, {}), container)
    })
    act(() => {
      render(h(Harness, {}), container)
    })

    expect(secondInstance).toBe(firstInstance)
  })
})