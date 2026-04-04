import { describe, expect, it } from 'vitest'
import {
  canSelectFile,
  resolvePreferredFile,
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
})
