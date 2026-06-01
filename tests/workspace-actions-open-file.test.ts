import { describe, expect, it, vi } from 'vitest'
import { openFileInPane } from '../src/features/project-editor/workspace-actions'
import { PaneWorkspace, type PaneBindings } from '../src/features/project-editor/pane'
import { PROJECT_EDITOR_STRINGS } from '../src/features/project-editor/project-editor-strings'
import type { PaneDocumentState, WorkspaceLayoutState } from '../src/features/project-editor/project-editor-types'
import { createEmptyRevisionRailState } from '../src/features/project-editor/project-editor-git-history-state'

function makeLayout(primaryPath: string | null): WorkspaceLayoutState {
  return {
    mode: 'single',
    ratio: 0.5,
    primaryPath,
    secondaryPath: null,
    activePane: 'primary',
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
    primary: { current: { flush: () => null, flushSync: () => null, isSerializationPending: () => false, tagOverlayRecalcRef: { current: false }, tagOverlayMatchesRef: { current: [] } } },
    secondary: { current: { flush: () => null, flushSync: () => null, isSerializationPending: () => false, tagOverlayRecalcRef: { current: false }, tagOverlayMatchesRef: { current: [] } } },
  }
}

describe('openFileInPane primary block-first guard', () => {
  it('blocks opening a different file when primary pane is dirty', () => {
    const primaryDirty = makePane('docs/a.md', '# dirty', true)
    const secondaryClean = makePane(null, '', false)
    const paneBindings: PaneBindings = {
      primaryPane: primaryDirty,
      secondaryPane: secondaryClean,
      setPrimaryPane: () => {},
      setSecondaryPane: () => {},
    }
    const workspace = new PaneWorkspace(makeLayout('docs/a.md'), paneBindings, makeRefs(), vi.fn())
    const setWorkspaceLayout = vi.fn()
    const setStatusMessage = vi.fn()
    const loadDocument = vi.fn()

    openFileInPane('docs/b.md', 'primary', {
      workspace,
      setWorkspaceLayout,
      setStatusMessage,
      loadDocument,
    })

    expect(setStatusMessage).toHaveBeenCalledWith(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
    expect(setWorkspaceLayout).not.toHaveBeenCalled()
    expect(loadDocument).not.toHaveBeenCalled()
  })

  it('allows opening the same file while primary pane is dirty', () => {
    const primaryDirty = makePane('docs/a.md', '# dirty', true)
    const secondaryClean = makePane(null, '', false)
    const paneBindings: PaneBindings = {
      primaryPane: primaryDirty,
      secondaryPane: secondaryClean,
      setPrimaryPane: () => {},
      setSecondaryPane: () => {},
    }
    const workspace = new PaneWorkspace(makeLayout('docs/a.md'), paneBindings, makeRefs(), vi.fn())
    const setWorkspaceLayout = vi.fn()
    const setStatusMessage = vi.fn()
    const loadDocument = vi.fn()

    openFileInPane('docs/a.md', 'primary', {
      workspace,
      setWorkspaceLayout,
      setStatusMessage,
      loadDocument,
    })

    expect(setStatusMessage).not.toHaveBeenCalled()
    expect(setWorkspaceLayout).toHaveBeenCalled()
    expect(loadDocument).not.toHaveBeenCalled()
  })
})
