import { describe, expect, it } from 'vitest'
import {
  createDefaultWorkspaceLayoutState,
  normalizeWorkspaceLayoutState,
} from '../src/features/project-editor/project-editor-logic'
import type { FocusScope } from '../src/features/project-editor/project-editor-types'

describe('focus mode and scope', () => {
  it('default layout has focus mode disabled', () => {
    const layout = createDefaultWorkspaceLayoutState()
    expect(layout.focusModeEnabled).toBe(false)
  })

  it('default layout has paragraph scope', () => {
    const layout = createDefaultWorkspaceLayoutState()
    expect(layout.focusScope).toBe('paragraph')
  })

  it('normalizes missing focusModeEnabled to false', () => {
    const base = createDefaultWorkspaceLayoutState()
    const normalized = normalizeWorkspaceLayoutState({
      ...base,
      focusModeEnabled: undefined as unknown as boolean,
    })
    expect(normalized.focusModeEnabled).toBe(false)
  })

  it('normalizes missing focusScope to paragraph', () => {
    const base = createDefaultWorkspaceLayoutState()
    const normalized = normalizeWorkspaceLayoutState({
      ...base,
      focusScope: undefined as unknown as FocusScope,
    })
    expect(normalized.focusScope).toBe('paragraph')
  })

  it('preserves focusModeEnabled true through normalization', () => {
    const base = { ...createDefaultWorkspaceLayoutState(), focusModeEnabled: true }
    const normalized = normalizeWorkspaceLayoutState(base)
    expect(normalized.focusModeEnabled).toBe(true)
  })

  it('preserves each valid focusScope value through normalization', () => {
    const scopes: FocusScope[] = ['line', 'sentence', 'paragraph']
    for (const scope of scopes) {
      const base = { ...createDefaultWorkspaceLayoutState(), focusScope: scope }
      const normalized = normalizeWorkspaceLayoutState(base)
      expect(normalized.focusScope).toBe(scope)
    }
  })
})
