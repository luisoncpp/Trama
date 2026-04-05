import { describe, expect, it } from 'vitest'
import {
  buildConflictCopyPath,
  canSelectFile,
  createDefaultWorkspaceLayoutState,
  normalizeWorkspaceLayoutState,
  reconcileWorkspaceLayout,
  resolvePreferredFile,
  restoreWorkspaceLayoutState,
  shouldRefreshTreeOnExternalEvent,
} from '../src/features/project-editor/project-editor-logic'
import type { ProjectSnapshot } from '../src/shared/ipc'

function buildSnapshot(paths: string[]): ProjectSnapshot {
  return {
    rootPath: 'C:/tmp/project',
    tree: [],
    markdownFiles: paths,
    index: {
      version: '1.0.0',
      corkboardOrder: {},
      cache: {},
    },
  }
}

describe('project editor logic helpers', () => {
  it('resolves preferred file when available', () => {
    const snapshot = buildSnapshot(['docs/a.md', 'docs/b.md'])
    expect(resolvePreferredFile(snapshot, 'docs/b.md')).toBe('docs/b.md')
  })

  it('falls back to first markdown file when preferred is missing', () => {
    const snapshot = buildSnapshot(['docs/a.md', 'docs/b.md'])
    expect(resolvePreferredFile(snapshot, 'docs/c.md')).toBe('docs/a.md')
  })

  it('allows selecting file when editor is clean', () => {
    expect(canSelectFile(false, 'docs/a.md', 'docs/b.md')).toBe(true)
  })

  it('blocks selecting a different file while dirty', () => {
    expect(canSelectFile(true, 'docs/a.md', 'docs/b.md')).toBe(false)
  })

  it('allows selecting same file while dirty', () => {
    expect(canSelectFile(true, 'docs/a.md', 'docs/a.md')).toBe(true)
  })

  it('refreshes tree only for add/unlink external events', () => {
    expect(shouldRefreshTreeOnExternalEvent('add')).toBe(true)
    expect(shouldRefreshTreeOnExternalEvent('unlink')).toBe(true)
    expect(shouldRefreshTreeOnExternalEvent('change')).toBe(false)
  })

  it('creates a conflict copy path when no prior copy exists', () => {
    const copyPath = buildConflictCopyPath('docs/a.md', ['docs/a.md'])
    expect(copyPath).toBe('docs/a.conflict-copy.md')
  })

  it('increments conflict copy suffix when copy path already exists', () => {
    const copyPath = buildConflictCopyPath('docs/a.md', [
      'docs/a.md',
      'docs/a.conflict-copy.md',
      'docs/a.conflict-copy-2.md',
    ])

    expect(copyPath).toBe('docs/a.conflict-copy-3.md')
  })

  it('restores default workspace layout when persisted data is invalid', () => {
    const restored = restoreWorkspaceLayoutState('invalid-json')
    expect(restored).toEqual(createDefaultWorkspaceLayoutState())
  })

  it('normalizes split ratio to accepted bounds', () => {
    const normalized = normalizeWorkspaceLayoutState({
      mode: 'single',
      ratio: 0.9,
      primaryPath: null,
      secondaryPath: null,
      activePane: 'primary',
    })

    expect(normalized.ratio).toBe(0.7)
  })

  it('reconciles split layout with available markdown files', () => {
    const reconciled = reconcileWorkspaceLayout(
      {
        mode: 'split',
        ratio: 0.5,
        primaryPath: 'docs/old.md',
        secondaryPath: null,
        activePane: 'secondary',
      },
      ['docs/a.md', 'docs/b.md'],
      undefined,
    )

    expect(reconciled.mode).toBe('split')
    expect(reconciled.primaryPath).toBe('docs/a.md')
    expect(reconciled.secondaryPath).toBe('docs/b.md')
    expect(reconciled.activePane).toBe('secondary')
  })

  it('applies preferred file to active secondary pane in split layout', () => {
    const reconciled = reconcileWorkspaceLayout(
      {
        mode: 'split',
        ratio: 0.5,
        primaryPath: 'docs/a.md',
        secondaryPath: 'docs/b.md',
        activePane: 'secondary',
      },
      ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      'docs/c.md',
    )

    expect(reconciled.primaryPath).toBe('docs/a.md')
    expect(reconciled.secondaryPath).toBe('docs/c.md')
    expect(reconciled.activePane).toBe('secondary')
  })
})
