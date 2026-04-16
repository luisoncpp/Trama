import { describe, expect, it } from 'vitest'
import {
  isPathInsideFolder,
  pruneWorkspaceLayoutPathsForFolderDelete,
  remapFolderPrefix,
  remapWorkspaceLayoutPathsForFolderRename,
} from '../src/features/project-editor/project-editor-folder-logic'
import { createDefaultWorkspaceLayoutState } from '../src/features/project-editor/project-editor-logic'

describe('project editor folder logic', () => {
  it('detects when path is inside folder prefix', () => {
    expect(isPathInsideFolder('book/Act-01/Scene-001.md', 'book/Act-01')).toBe(true)
    expect(isPathInsideFolder('book/Act-02/Scene-001.md', 'book/Act-01')).toBe(false)
    expect(isPathInsideFolder(null, 'book/Act-01')).toBe(false)
  })

  it('remaps file path prefix for renamed folder', () => {
    expect(remapFolderPrefix('book/Act-01/Scene-001.md', 'book/Act-01', 'book/Act-02')).toBe('book/Act-02/Scene-001.md')
    expect(remapFolderPrefix('book/Act-03/Scene-001.md', 'book/Act-01', 'book/Act-02')).toBe('book/Act-03/Scene-001.md')
    expect(remapFolderPrefix(null, 'book/Act-01', 'book/Act-02')).toBeNull()
  })

  it('remaps both pane paths in workspace layout', () => {
    const layout = {
      ...createDefaultWorkspaceLayoutState(),
      mode: 'split' as const,
      primaryPath: 'book/Act-01/Scene-001.md',
      secondaryPath: 'book/Act-01/Scene-002.md',
      activePane: 'secondary' as const,
    }

    const remapped = remapWorkspaceLayoutPathsForFolderRename(layout, 'book/Act-01', 'book/Act-02')

    expect(remapped.primaryPath).toBe('book/Act-02/Scene-001.md')
    expect(remapped.secondaryPath).toBe('book/Act-02/Scene-002.md')
    expect(remapped.activePane).toBe('secondary')
  })

  it('clears pane paths that were inside deleted folder', () => {
    const layout = {
      ...createDefaultWorkspaceLayoutState(),
      mode: 'split' as const,
      primaryPath: 'book/Act-01/Scene-001.md',
      secondaryPath: 'book/Act-02/Scene-002.md',
      activePane: 'primary' as const,
    }

    const pruned = pruneWorkspaceLayoutPathsForFolderDelete(layout, 'book/Act-01')

    expect(pruned.primaryPath).toBeNull()
    expect(pruned.secondaryPath).toBe('book/Act-02/Scene-002.md')
    expect(pruned.activePane).toBe('primary')
  })
})
