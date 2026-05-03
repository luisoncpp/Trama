import { describe, expect, it } from 'vitest'
import { PaneWorkspace } from '../src/features/project-editor/pane-workspace'
import type { PaneDocumentState, WorkspaceLayoutState } from '../src/features/project-editor/project-editor-types'

function makeLayout(activePane: 'primary' | 'secondary', primaryPath: string | null, secondaryPath: string | null): WorkspaceLayoutState {
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

describe('PaneWorkspace', () => {
  const primaryClean = makePane('docs/a.md', '# A content', false)
  const primaryDirty = makePane('docs/a.md', '# A modified', true)
  const secondaryClean = makePane('docs/b.md', '# B content', false)
  const secondaryDirty = makePane('docs/b.md', '# B modified', true)
  const emptyPane = makePane(null, '', false)

  describe('getActivePaneDocument()', () => {
    it('returns primary pane when activePane is primary', () => {
      const layout = makeLayout('primary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryDirty, secondaryClean)

      const doc = ws.getActivePaneDocument()

      expect(doc.selectedPath).toBe('docs/a.md')
      expect(doc.editorValue).toBe('# A modified')
      expect(doc.isDirty).toBe(true)
      expect(doc.path).toBe('docs/a.md')
    })

    it('returns secondary pane when activePane is secondary', () => {
      const layout = makeLayout('secondary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryClean, secondaryDirty)

      const doc = ws.getActivePaneDocument()

      expect(doc.selectedPath).toBe('docs/b.md')
      expect(doc.editorValue).toBe('# B modified')
      expect(doc.isDirty).toBe(true)
    })

    it('uses layout path, not document path, for selectedPath (async loading gap)', () => {
      const layout = makeLayout('secondary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryClean, emptyPane)

      const doc = ws.getActivePaneDocument()

      expect(doc.selectedPath).toBe('docs/b.md')
      expect(doc.editorValue).toBe('')
    })
  })

  describe('getPaneDocument(pane)', () => {
    it('returns primary pane document', () => {
      const layout = makeLayout('secondary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryDirty, secondaryClean)

      expect(ws.getPaneDocument('primary')).toEqual({
        path: 'docs/a.md',
        content: '# A modified',
        isDirty: true,
      })
    })

    it('returns secondary pane document', () => {
      const layout = makeLayout('primary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryClean, secondaryDirty)

      expect(ws.getPaneDocument('secondary')).toEqual({
        path: 'docs/b.md',
        content: '# B modified',
        isDirty: true,
      })
    })
  })

  describe('isPaneDirty(pane?)', () => {
    it('returns dirty state for specific pane', () => {
      const layout = makeLayout('primary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryDirty, secondaryClean)

      expect(ws.isPaneDirty('primary')).toBe(true)
      expect(ws.isPaneDirty('secondary')).toBe(false)
    })

    it('uses active pane when pane is omitted', () => {
      const layout = makeLayout('secondary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryClean, secondaryDirty)

      expect(ws.isPaneDirty()).toBe(true)
    })

    it('returns false for empty pane (no path)', () => {
      const layout = makeLayout('primary', 'docs/a.md', null)
      const ws = new PaneWorkspace(layout, primaryDirty, emptyPane)

      expect(ws.isPaneDirty('secondary')).toBe(false)
    })
  })

  describe('canSwitchAwayFrom(pane?)', () => {
    it('returns true when pane is clean', () => {
      const layout = makeLayout('primary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryClean, secondaryClean)

      expect(ws.canSwitchAwayFrom('primary')).toBe(true)
    })

    it('returns true when pane has no path (not loaded)', () => {
      const layout = makeLayout('primary', 'docs/a.md', null)
      const ws = new PaneWorkspace(layout, primaryDirty, emptyPane)

      expect(ws.canSwitchAwayFrom('secondary')).toBe(true)
    })

    it('returns false when pane is dirty and has a path', () => {
      const layout = makeLayout('primary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryDirty, secondaryClean)

      expect(ws.canSwitchAwayFrom('primary')).toBe(false)
    })

    it('uses active pane when pane is omitted', () => {
      const layout = makeLayout('primary', 'docs/a.md', 'docs/b.md')
      const ws = new PaneWorkspace(layout, primaryDirty, secondaryClean)

      expect(ws.canSwitchAwayFrom()).toBe(false)
    })
  })

  describe('getters', () => {
    it('layout returns a frozen copy', () => {
      const layout = makeLayout('primary', 'docs/a.md', null)
      const ws = new PaneWorkspace(layout, primaryClean, emptyPane)

      expect(ws.layout).toEqual(layout)
      expect(Object.isFrozen(ws.layout)).toBe(true)
      expect(ws.layout.activePane).toBe('primary')
    })

    it('primary returns a frozen copy (immutable)', () => {
      const layout = makeLayout('primary', 'docs/a.md', null)
      const ws = new PaneWorkspace(layout, primaryDirty, emptyPane)

      expect(ws.primary).not.toBe(primaryDirty)
      expect(ws.primary.isDirty).toBe(true)
      expect(Object.isFrozen(ws.primary)).toBe(true)
    })

    it('secondary returns a frozen copy (immutable)', () => {
      const layout = makeLayout('primary', 'docs/a.md', null)
      const ws = new PaneWorkspace(layout, primaryClean, secondaryDirty)

      expect(ws.secondary).not.toBe(secondaryDirty)
      expect(ws.secondary.isDirty).toBe(true)
      expect(Object.isFrozen(ws.secondary)).toBe(true)
    })
  })
})
