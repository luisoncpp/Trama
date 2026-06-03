import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'preact/test-utils'
import { PaneWorkspace, type PaneBindings } from '../src/features/project-editor/pane'
import type { PaneDocumentState, WorkspaceLayoutState } from '../src/features/project-editor/project-editor-types'
import { createEmptyRevisionRailState } from '../src/features/project-editor/project-editor-git-history-state'

function makeLayout(activePane: 'primary' | 'secondary', primaryPath: string | null, secondaryPath: string | null): WorkspaceLayoutState {
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
  return { path, content, meta: {}, isDirty, reloadVersion: 0, revisionRail: createEmptyRevisionRailState() }
}

function makeRefs() {
  return {
    primary: {
      current: {
        flush: (): string | null => '# flushed',
        flushSync: (): string | null => '# flushed',
        isSerializationPending: () => false,
        tagOverlayRecalcRef: { current: false },
        tagOverlayMatchesRef: { current: [] },
      },
    },
    secondary: {
      current: {
        flush: (): string | null => '# flushed',
        flushSync: (): string | null => '# flushed',
        isSerializationPending: () => false,
        tagOverlayRecalcRef: { current: false },
        tagOverlayMatchesRef: { current: [] },
      },
    },
  }
}

const saveDocumentFn = vi.fn().mockResolvedValue(undefined)

function makeWs(
  activePane: 'primary' | 'secondary',
  primary: PaneDocumentState,
  secondary: PaneDocumentState,
  bindings?: Partial<Pick<PaneBindings, 'setPrimaryPane' | 'setSecondaryPane'>>,
) {
  const paneBindings: PaneBindings = {
    primaryPane: primary,
    secondaryPane: secondary,
    setPrimaryPane: bindings?.setPrimaryPane ?? (() => {}),
    setSecondaryPane: bindings?.setSecondaryPane ?? (() => {}),
  }
  return new PaneWorkspace(makeLayout(activePane, primary.path, secondary.path), paneBindings, makeRefs(), saveDocumentFn)
}

describe('PaneWorkspace', () => {
  const primaryClean = makePane('docs/a.md', '# A content', false)
  const primaryDirty = makePane('docs/a.md', '# A modified', true)
  const secondaryClean = makePane('docs/b.md', '# B content', false)
  const secondaryDirty = makePane('docs/b.md', '# B modified', true)
  const emptyPane = makePane(null, '', false)

  beforeEach(() => saveDocumentFn.mockClear())

  describe('getActivePaneDocument()', () => {
    it('returns primary pane when activePane is primary', () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      const doc = ws.getActivePaneDocument()

      expect(doc.selectedPath).toBe('docs/a.md')
      expect(doc.editorValue).toBe('# A modified')
      expect(doc.isDirty).toBe(true)
      expect(doc.path).toBe('docs/a.md')
    })

    it('returns secondary pane when activePane is secondary', () => {
      const ws = makeWs('secondary', primaryClean, secondaryDirty)

      const doc = ws.getActivePaneDocument()

      expect(doc.selectedPath).toBe('docs/b.md')
      expect(doc.editorValue).toBe('# B modified')
      expect(doc.isDirty).toBe(true)
    })

    it('uses layout path, not document path, for selectedPath (async loading gap)', () => {
      const layout = makeLayout('secondary', 'docs/a.md', 'docs/b.md')
      const paneBindings: PaneBindings = {
        primaryPane: primaryClean,
        secondaryPane: emptyPane,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(layout, paneBindings, makeRefs(), saveDocumentFn)

      const doc = ws.getActivePaneDocument()

      expect(doc.selectedPath).toBe('docs/b.md')
      expect(doc.editorValue).toBe('')
    })
  })

  describe('getPaneDocument(pane)', () => {
    it('returns primary pane document', () => {
      const ws = makeWs('secondary', primaryDirty, secondaryClean)

      expect(ws.getPaneDocument('primary')).toEqual({
        path: 'docs/a.md',
        content: '# A modified',
        isDirty: true,
        meta: {},
        reloadVersion: 0,
        revisionRail: createEmptyRevisionRailState(),
      })
    })

    it('returns secondary pane document', () => {
      const ws = makeWs('primary', primaryClean, secondaryDirty)

      expect(ws.getPaneDocument('secondary')).toEqual({
        path: 'docs/b.md',
        content: '# B modified',
        isDirty: true,
        meta: {},
        reloadVersion: 0,
        revisionRail: createEmptyRevisionRailState(),
      })
    })
  })

  describe('isPaneDirty(pane?)', () => {
    it('returns dirty state for specific pane', () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      expect(ws.isPaneDirty('primary')).toBe(true)
      expect(ws.isPaneDirty('secondary')).toBe(false)
    })

    it('uses active pane when pane is omitted', () => {
      const ws = makeWs('secondary', primaryClean, secondaryDirty)

      expect(ws.isPaneDirty()).toBe(true)
    })

    it('returns false for empty pane (no path)', () => {
      const layout = makeLayout('primary', 'docs/a.md', null)
      const paneBindings: PaneBindings = {
        primaryPane: primaryDirty,
        secondaryPane: emptyPane,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(layout, paneBindings, makeRefs(), saveDocumentFn)

      expect(ws.isPaneDirty('secondary')).toBe(false)
    })
  })

  describe('canSwitchAwayFrom(pane?)', () => {
    it('returns true when pane is clean', () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      expect(ws.canSwitchAwayFrom('primary')).toBe(true)
    })

    it('returns true when pane has no path (not loaded)', () => {
      const layout = makeLayout('primary', 'docs/a.md', null)
      const paneBindings: PaneBindings = {
        primaryPane: primaryDirty,
        secondaryPane: emptyPane,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(layout, paneBindings, makeRefs(), saveDocumentFn)

      expect(ws.canSwitchAwayFrom('secondary')).toBe(true)
    })

    it('returns false when pane is dirty and has a path', () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      expect(ws.canSwitchAwayFrom('primary')).toBe(false)
    })

    it('uses active pane when pane is omitted', () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      expect(ws.canSwitchAwayFrom()).toBe(false)
    })
  })

  describe('getters', () => {
    it('layout returns a frozen copy', () => {
      const layout = makeLayout('primary', 'docs/a.md', null)
      const paneBindings: PaneBindings = {
        primaryPane: primaryClean,
        secondaryPane: emptyPane,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(layout, paneBindings, makeRefs(), saveDocumentFn)

      expect(ws.layout).toEqual(layout)
      expect(Object.isFrozen(ws.layout)).toBe(true)
      expect(ws.layout.activePane).toBe('primary')
    })

    it('primary returns a frozen copy (immutable)', () => {
      const ws = makeWs('primary', primaryDirty, emptyPane)

      expect(ws.primary).not.toBe(primaryDirty)
      expect(ws.primary.isDirty).toBe(true)
      expect(Object.isFrozen(ws.primary)).toBe(true)
    })

    it('secondary returns a frozen copy (immutable)', () => {
      const ws = makeWs('primary', primaryClean, secondaryDirty)

      expect(ws.secondary).not.toBe(secondaryDirty)
      expect(ws.secondary.isDirty).toBe(true)
      expect(Object.isFrozen(ws.secondary)).toBe(true)
    })
  })

  describe('savePaneIfDirty', () => {
    it('does not save clean pane', async () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      await ws.savePaneIfDirty('primary')

      expect(saveDocumentFn).not.toHaveBeenCalled()
    })

    it('does not save dirty pane without path', async () => {
      const dirtyNoPath = makePane(null, '# content', true)
      const paneBindings: PaneBindings = {
        primaryPane: dirtyNoPath,
        secondaryPane: emptyPane,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', null, null), paneBindings, makeRefs(), saveDocumentFn)

      await ws.savePaneIfDirty('primary')

      expect(saveDocumentFn).not.toHaveBeenCalled()
    })

    it('saves dirty pane with path', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      await ws.savePaneIfDirty('primary')

      expect(saveDocumentFn).toHaveBeenCalledWith('docs/a.md', '# flushed', {})
    })

    it('uses pane content when flush returns null', async () => {
      const refs = makeRefs()
      refs.primary.current.flush = () => null
      const paneBindings: PaneBindings = {
        primaryPane: primaryDirty,
        secondaryPane: secondaryClean,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', primaryDirty.path, secondaryClean.path), paneBindings, refs, saveDocumentFn)

      await ws.savePaneIfDirty('primary')

      expect(saveDocumentFn).toHaveBeenCalledWith('docs/a.md', '# A modified', {})
    })
  })

  describe('saveAllDirtyPanes', () => {
    it('saves both panes when dirty', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryDirty)

      await ws.saveAllDirtyPanes()

      expect(saveDocumentFn).toHaveBeenCalledTimes(2)
    })

    it('saves only dirty pane', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      await ws.saveAllDirtyPanes()

      expect(saveDocumentFn).toHaveBeenCalledTimes(1)
      expect(saveDocumentFn).toHaveBeenCalledWith('docs/a.md', '# flushed', {})
    })
  })

  describe('savePaneNow', () => {
    it('returns no-op for clean pane', async () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      const result = await ws.savePaneNow('primary')

      expect(result).toEqual({ kind: 'no-op', path: 'docs/a.md' })
      expect(saveDocumentFn).not.toHaveBeenCalled()
    })

    it('returns saved for dirty pane with path', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      const result = await ws.savePaneNow('primary')

      expect(result).toEqual({ kind: 'saved', path: 'docs/a.md' })
      expect(saveDocumentFn).toHaveBeenCalledWith('docs/a.md', '# flushed', {})
    })

    it('returns failed when save throws', async () => {
      saveDocumentFn.mockRejectedValueOnce(new Error('disk full'))
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      const result = await ws.savePaneNow('primary')

      expect(result).toEqual({ kind: 'failed', path: 'docs/a.md', error: 'disk full' })
    })
  })

  describe('preparePaneExit', () => {
    it('returns empty reason when pane has no path', async () => {
      const dirtyNoPath = makePane(null, '# content', true)
      const paneBindings: PaneBindings = {
        primaryPane: dirtyNoPath,
        secondaryPane: emptyPane,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', null, null), paneBindings, makeRefs(), saveDocumentFn)

      const result = await ws.preparePaneExit('primary')

      expect(result).toEqual({ kind: 'continued', reason: 'empty', path: null })
      expect(saveDocumentFn).not.toHaveBeenCalled()
    })

    it('returns clean reason without saving', async () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      const result = await ws.preparePaneExit('primary')

      expect(result).toEqual({ kind: 'continued', reason: 'clean', path: 'docs/a.md' })
      expect(saveDocumentFn).not.toHaveBeenCalled()
    })

    it('returns saved reason after saving dirty pane', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      const result = await ws.preparePaneExit('primary')

      expect(result).toEqual({ kind: 'continued', reason: 'saved', path: 'docs/a.md' })
      expect(saveDocumentFn).toHaveBeenCalledWith('docs/a.md', '# flushed', {})
    })

    it('returns failed when save throws', async () => {
      saveDocumentFn.mockRejectedValueOnce(new Error('write denied'))
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      const result = await ws.preparePaneExit('primary')

      expect(result).toEqual({ kind: 'failed', path: 'docs/a.md', error: 'write denied' })
    })
  })

  describe('preparePaneRevert', () => {
    it('returns no-op when pane is clean', () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      const result = ws.preparePaneRevert('primary')

      expect(result).toEqual({ kind: 'no-op', path: 'docs/a.md' })
    })

    it('returns no-op when pane has no path', () => {
      const dirtyNoPath = makePane(null, '# content', true)
      const paneBindings: PaneBindings = {
        primaryPane: dirtyNoPath,
        secondaryPane: emptyPane,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', null, null), paneBindings, makeRefs(), saveDocumentFn)

      const result = ws.preparePaneRevert('primary')

      expect(result).toEqual({ kind: 'no-op', path: null })
    })

    it('flushes and returns reverted path for dirty pane', () => {
      const flushSpy = vi.fn(() => '# flushed for revert')
      const refs = makeRefs()
      refs.primary.current.flush = flushSpy
      const paneBindings: PaneBindings = {
        primaryPane: primaryDirty,
        secondaryPane: secondaryClean,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', primaryDirty.path, secondaryClean.path), paneBindings, refs, saveDocumentFn)

      const result = ws.preparePaneRevert('primary')

      expect(flushSpy).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ kind: 'reverted', path: 'docs/a.md' })
      expect(saveDocumentFn).not.toHaveBeenCalled()
    })
  })

  describe('getLastSavedContent', () => {
    it('returns null when no snapshot exists', () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      expect(ws.getLastSavedContent('docs/a.md')).toBeNull()
    })

    it('returns null for path not in snapshot map', () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      ws.getLastSavedContent('docs/a.md')

      expect(ws.getLastSavedContent('docs/nonexistent.md')).toBeNull()
    })

    it('returns stored snapshot after savePaneIfDirty', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      await ws.savePaneIfDirty('primary')

      expect(ws.getLastSavedContent('docs/a.md')).toBe('# flushed')
    })

    it('stores different snapshots for different paths', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryDirty)

      await ws.saveAllDirtyPanes()

      expect(ws.getLastSavedContent('docs/a.md')).toBe('# flushed')
      expect(ws.getLastSavedContent('docs/b.md')).toBe('# flushed')
    })
  })

  describe('checkExternalChangeMatchesSavedSnapshot', () => {
    let logSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => { logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) })
    afterEach(() => { logSpy.mockRestore() })

    it('returns false when no snapshot exists', async () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      const result = await ws.checkExternalChangeMatchesSavedSnapshot('docs/a.md', '# external content')

      expect(result).toBe(false)
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('no saved snapshot exists'))
    })

    it('returns true when external content matches saved snapshot', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      await ws.savePaneIfDirty('primary')

      const result = await ws.checkExternalChangeMatchesSavedSnapshot('docs/a.md', '# flushed')

      expect(result).toBe(true)
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('match: true'))
    })

    it('returns false when external content differs from saved snapshot', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      await ws.savePaneIfDirty('primary')

      const result = await ws.checkExternalChangeMatchesSavedSnapshot('docs/a.md', '# different content')

      expect(result).toBe(false)
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('match: false'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('first difference at index'))
    })

    it('uses exact string comparison', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      await ws.savePaneIfDirty('primary')

      expect(await ws.checkExternalChangeMatchesSavedSnapshot('docs/a.md', '#flushed')).toBe(false)
      expect(await ws.checkExternalChangeMatchesSavedSnapshot('docs/a.md', '# flushed ')).toBe(false)
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('match: false'))
    })
  })

  describe('destroy', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('does not clear an external saved content map on destroy', async () => {
      const sharedMap = new Map<string, string>()
      const paneBindings: PaneBindings = {
        primaryPane: primaryDirty,
        secondaryPane: secondaryClean,
        setPrimaryPane: () => {},
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(
        makeLayout('primary', primaryDirty.path, secondaryClean.path),
        paneBindings,
        makeRefs(),
        saveDocumentFn,
        sharedMap,
      )

      await ws.savePaneIfDirty('primary')
      expect(ws.getLastSavedContent('docs/a.md')).toBe('# flushed')

      ws.destroy()

      expect(sharedMap.get('docs/a.md')).toBe('# flushed')
    })

    it('clears its own saved content map on destroy when no external map is provided', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      await ws.savePaneIfDirty('primary')
      expect(ws.getLastSavedContent('docs/a.md')).toBe('# flushed')

      ws.destroy()

      expect(ws.getLastSavedContent('docs/a.md')).toBeNull()
    })
  })

  describe('markPaneDirty / updatePaneContent', () => {
    it('markPaneDirty sets dirty without changing content', () => {
      let nextPrimary = primaryClean
      const paneBindings: PaneBindings = {
        primaryPane: primaryClean,
        secondaryPane: secondaryClean,
        setPrimaryPane: (value) => {
          nextPrimary = typeof value === 'function' ? value(nextPrimary) : value
        },
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', primaryClean.path, secondaryClean.path), paneBindings, makeRefs(), saveDocumentFn)

      ws.markPaneDirty('primary')

      expect(nextPrimary.content).toBe('# A content')
      expect(nextPrimary.isDirty).toBe(true)
    })

    it('markPaneDirty is a no-op when the pane is already dirty', () => {
      let nextPrimary = primaryDirty
      let updates = 0
      const paneBindings: PaneBindings = {
        primaryPane: primaryDirty,
        secondaryPane: secondaryClean,
        setPrimaryPane: (value) => {
          updates += 1
          const prev = nextPrimary
          nextPrimary = typeof value === 'function' ? value(nextPrimary) : value
          expect(nextPrimary).toBe(prev)
        },
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', primaryDirty.path, secondaryClean.path), paneBindings, makeRefs(), saveDocumentFn)

      ws.markPaneDirty('primary')

      expect(updates).toBe(1)
      expect(nextPrimary.isDirty).toBe(true)
      expect(nextPrimary.content).toBe('# A modified')
    })

    it('updatePaneContent still updates content and marks dirty', () => {
      let nextPrimary = primaryClean
      const paneBindings: PaneBindings = {
        primaryPane: primaryClean,
        secondaryPane: secondaryClean,
        setPrimaryPane: (value) => {
          nextPrimary = typeof value === 'function' ? value(nextPrimary) : value
        },
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', primaryClean.path, secondaryClean.path), paneBindings, makeRefs(), saveDocumentFn)

      ws.updatePaneContent('primary', '# A changed')

      expect(nextPrimary.content).toBe('# A changed')
      expect(nextPrimary.isDirty).toBe(true)
    })

    it('updatePaneMetaForPane updates meta and marks dirty', () => {
      let nextPrimary = primaryClean
      const paneBindings: PaneBindings = {
        primaryPane: primaryClean,
        secondaryPane: secondaryClean,
        setPrimaryPane: (value) => {
          nextPrimary = typeof value === 'function' ? value(nextPrimary) : value
        },
        setSecondaryPane: () => {},
      }
      const ws = new PaneWorkspace(makeLayout('primary', primaryClean.path, secondaryClean.path), paneBindings, makeRefs(), saveDocumentFn)

      ws.updatePaneMetaForPane('primary', { type: 'map', name: 'Realm Map' })

      expect(nextPrimary.meta).toEqual({ type: 'map', name: 'Realm Map' })
      expect(nextPrimary.isDirty).toBe(true)
    })
  })

  describe('pane navigation history', () => {
    it('records per-pane history and truncates forward entries on new navigation', () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      ws.recordPaneNavigation('primary', 'docs/a.md')
      ws.recordPaneNavigation('primary', 'docs/b.md')
      expect(ws.getPaneNavigationHistory('primary')).toEqual({
        entries: ['docs/a.md', 'docs/b.md'],
        index: 1,
      })

      expect(ws.stepPaneNavigationHistory('primary', -1)).toBe('docs/a.md')
      ws.recordPaneNavigation('primary', 'docs/c.md')

      expect(ws.getPaneNavigationHistory('primary')).toEqual({
        entries: ['docs/a.md', 'docs/c.md'],
        index: 1,
      })
      expect(ws.getNextPathInPaneHistory('primary')).toBeNull()
    })

    it('keeps primary and secondary histories isolated', () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      ws.recordPaneNavigation('primary', 'docs/a.md')
      ws.recordPaneNavigation('secondary', 'docs/b.md')

      expect(ws.getPaneNavigationHistory('primary')).toEqual({ entries: ['docs/a.md'], index: 0 })
      expect(ws.getPaneNavigationHistory('secondary')).toEqual({ entries: ['docs/b.md'], index: 0 })
    })
  })

  describe('scheduleAutosave / cancelAutosave / destroy', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('scheduleAutosave calls savePaneIfDirty after delay', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      ws.scheduleAutosave('primary', 50)

      expect(saveDocumentFn).not.toHaveBeenCalled()
      await act(async () => { vi.advanceTimersByTime(51); await Promise.resolve() })
      expect(saveDocumentFn).toHaveBeenCalled()
    })

    it('cancelAutosave stops a pending timer', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      ws.scheduleAutosave('primary', 50)
      ws.cancelAutosave()

      await act(async () => { vi.advanceTimersByTime(51); await Promise.resolve() })
      expect(saveDocumentFn).not.toHaveBeenCalled()
    })

    it('calling scheduleAutosave again cancels the previous timer', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      ws.scheduleAutosave('primary', 50)
      ws.scheduleAutosave('primary', 30)

      await act(async () => { vi.advanceTimersByTime(31); await Promise.resolve() })
      expect(saveDocumentFn).toHaveBeenCalledTimes(1)

      await act(async () => { vi.advanceTimersByTime(30); await Promise.resolve() })
      expect(saveDocumentFn).toHaveBeenCalledTimes(1)
    })

    it('destroy cancels any pending timer', async () => {
      const ws = makeWs('primary', primaryDirty, secondaryClean)

      ws.scheduleAutosave('primary', 50)
      ws.destroy()

      await act(async () => { vi.advanceTimersByTime(51); await Promise.resolve() })
      expect(saveDocumentFn).not.toHaveBeenCalled()
    })

    it('cancelAutosave on idle timer is a no-op (no throw)', () => {
      const ws = makeWs('primary', primaryClean, secondaryClean)

      expect(() => ws.cancelAutosave()).not.toThrow()
    })
  })
})
