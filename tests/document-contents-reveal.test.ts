import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  computeCenteredScrollTop,
  parseDocumentHeadings,
  revealQuillHeading,
  scanQuillHeadings,
} from '../src/features/project-editor/document-contents'
import { revealDocumentHeading } from '../src/features/project-editor/workspace-actions'
import { PaneWorkspace, type PaneBindings } from '../src/features/project-editor/pane'
import { EditorSessionImpl } from '../src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-lifecycle'
import type { PaneDocumentState, WorkspaceLayoutState } from '../src/features/project-editor/project-editor-types'
import { createEmptyRevisionRailState } from '../src/features/project-editor/project-editor-git-history-state'

import { LayoutDirectiveController } from '../src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/layout-directive-controller'
import { renderDirectiveArtifactsToMarkdown } from '../src/shared/markdown-layout-directives'

let host: HTMLDivElement

beforeEach(() => {
  LayoutDirectiveController.register()
  if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
    ;(Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
      () => new DOMRect(0, 0, 0, 0)
  }
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  host.remove()
})

function createSession(value: string, onDirty: () => void = () => {}): EditorSessionImpl {
  const session = new EditorSessionImpl({
    host,
    documentId: 'contents-reveal-doc',
    value,
    spellcheckEnabled: false,
    onChangeRef: { current: () => {} },
    onDirtyRef: { current: onDirty },
  })
  const editor = session.getEditor()
  if (editor) {
    LayoutDirectiveController.addClipboardMatchers(editor)
  }
  return session
}

describe('scanQuillHeadings', () => {
  it('returns headings in document order with levels, texts, and ascending quill indexes', () => {
    const session = createSession('# One\n\nText body.\n\n## Two\n\n### Three\n')
    const headings = scanQuillHeadings(session.getEditor()!)

    expect(headings.map((h) => [h.level, h.text])).toEqual([
      [1, 'One'],
      [2, 'Two'],
      [3, 'Three'],
    ])
    expect(headings[0].index).toBe(0)
    expect(headings[1].index).toBeGreaterThan(headings[0].index)
    expect(headings[2].index).toBeGreaterThan(headings[1].index)
    session.dispose()
  })

  it('keeps duplicate heading texts as separate entries', () => {
    const session = createSession('## Repeat\n\nFirst body.\n\n## Repeat\n\nSecond body.\n')
    const headings = scanQuillHeadings(session.getEditor()!)

    expect(headings.map((h) => h.text)).toEqual(['Repeat', 'Repeat'])
    expect(headings[1].index).toBeGreaterThan(headings[0].index)
    session.dispose()
  })

  it('scans page break and spacer embeds as document content items', () => {
    const markdown = [
      '# One',
      '',
      'Text body.',
      '',
      '<!-- trama:pagebreak -->',
      '<!-- trama:spacer lines=3 -->',
      '',
      '## Two',
      '',
    ].join('\n')
    const session = createSession(markdown)
    const editor = session.getEditor()!

    const headings = scanQuillHeadings(editor)

    expect(headings.map((h) => [h.type, h.text])).toEqual([
      ['heading', 'One'],
      ['pagebreak', 'Page Break'],
      ['spacer', 'Spacer (3 lines)'],
      ['heading', 'Two'],
    ])
    session.dispose()
  })

  it('stays aligned with the markdown parser (shared heading definition)', () => {
    const markdown = [
      '# Part One',
      '',
      'Intro text.',
      '',
      '<!-- trama:pagebreak -->',
      '',
      '```',
      '# not a heading',
      '```',
      '',
      '<!-- trama:spacer lines=2 -->',
      '',
      '## **Bold** _title_',
      '',
      '#### Too deep',
      '',
      '## Closed ##',
      '',
      '## **Bold** _title_',
    ].join('\n')
    const session = createSession(markdown)

    const parsed = parseDocumentHeadings(markdown)
    const scanned = scanQuillHeadings(session.getEditor()!)
    expect(scanned.map((s) => [s.type ?? 'heading', s.level, s.text])).toEqual(parsed.map((p) => [p.type ?? 'heading', p.level, p.text]))
    session.dispose()
  })
})

describe('revealQuillHeading', () => {
  it('centers viewport-relative bounds without discarding the current scroll offset', () => {
    const container = document.createElement('div')
    Object.defineProperties(container, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 2400 },
      scrollTop: { configurable: true, writable: true, value: 900 },
    })

    expect(computeCenteredScrollTop(container, { top: 320, height: 40 })).toBe(1040)
  })

  it('places the caret at the start of the heading matching the ordinal', () => {
    const session = createSession('# Alpha\n\nBody.\n\n## Beta\n\nMore.\n\n### Gamma\n')
    const editor = session.getEditor()!
    const headings = scanQuillHeadings(editor)

    revealQuillHeading(host, editor, { ordinal: 1, level: 2, text: 'Beta' })

    expect(editor.getSelection()?.index).toBe(headings[1].index)
    session.dispose()
  })

  it('resolves duplicates by ordinal, never by text', () => {
    const session = createSession('## Repeat\n\nFirst body.\n\n## Repeat\n\nSecond body.\n')
    const editor = session.getEditor()!
    const headings = scanQuillHeadings(editor)

    revealQuillHeading(host, editor, { ordinal: 1, level: 2, text: 'Repeat' })
    expect(editor.getSelection()?.index).toBe(headings[1].index)

    revealQuillHeading(host, editor, { ordinal: 0, level: 2, text: 'Repeat' })
    expect(editor.getSelection()?.index).toBe(headings[0].index)
    session.dispose()
  })

  it('clamps out-of-range ordinals to the nearest heading instead of throwing', () => {
    const session = createSession('# First\n\nBody.\n\n## Last\n')
    const editor = session.getEditor()!
    const headings = scanQuillHeadings(editor)

    revealQuillHeading(host, editor, { ordinal: 99, level: 1, text: 'Nope' })
    expect(editor.getSelection()?.index).toBe(headings[headings.length - 1].index)

    revealQuillHeading(host, editor, { ordinal: -4, level: 1, text: 'Nope' })
    expect(editor.getSelection()?.index).toBe(headings[0].index)
    session.dispose()
  })

  it('is a no-op on documents without headings', () => {
    const session = createSession('Just prose, no headings.\n')
    const editor = session.getEditor()!

    expect(() => revealQuillHeading(host, editor, { ordinal: 0, level: 1, text: 'X' })).not.toThrow()
    session.dispose()
  })
})

describe('EditorSession.revealHeading', () => {
  it('places the caret and moves keyboard focus to the editor', () => {
    const session = createSession('# Alpha\n\nBody.\n\n## Beta\n')
    const editor = session.getEditor()!
    const headings = scanQuillHeadings(editor)
    const focusSpy = vi.spyOn(editor, 'focus')

    session.revealHeading({ ordinal: 1, level: 2, text: 'Beta' })

    expect(editor.getSelection()?.index).toBe(headings[1].index)
    expect(editor.hasFocus()).toBe(true)
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    session.dispose()
  })

  it('never marks the document dirty and survives the settle re-assert', async () => {
    const onDirty = vi.fn()
    const session = createSession('# Alpha\n\nBody.\n\n## Beta\n', onDirty)
    const editor = session.getEditor()!
    const headings = scanQuillHeadings(editor)
    const canonicalBefore = session.getCanonicalValue()

    session.revealHeading({ ordinal: 1, level: 2, text: 'Beta' })
    await new Promise((resolve) => setTimeout(resolve, 220))

    expect(onDirty).not.toHaveBeenCalled()
    expect(session.getCanonicalValue()).toBe(canonicalBefore)
    expect(editor.getSelection()?.index).toBe(headings[1].index)
    session.dispose()
  })

  it('skips focus but still reveals when the editor is disabled (read-only preview)', () => {
    const session = createSession('# Alpha\n\nBody.\n\n## Beta\n')
    const editor = session.getEditor()!
    const headings = scanQuillHeadings(editor)
    session.setDisabled(true, true)
    const focusSpy = vi.spyOn(editor, 'focus')

    session.revealHeading({ ordinal: 1, level: 2, text: 'Beta' })

    expect(editor.isEnabled()).toBe(false)
    expect(editor.getSelection()?.index).toBe(headings[1].index)
    expect(focusSpy).not.toHaveBeenCalled()
    session.dispose()
  })

  it('is a no-op after dispose', () => {
    const session = createSession('# Alpha\n')
    session.dispose()

    expect(() => session.revealHeading({ ordinal: 0, level: 1, text: 'Alpha' })).not.toThrow()
  })
})

describe('revealDocumentHeading workspace action', () => {
  function makeLayout(activePane: 'primary' | 'secondary'): WorkspaceLayoutState {
    return {
      mode: 'split',
      ratio: 0.5,
      primaryPath: 'docs/a.md',
      secondaryPath: 'docs/b.md',
      activePane,
      focusModeEnabled: false,
      focusScope: 'paragraph',
      zoomLevel: 1,
    }
  }

  function makePane(path: string, content: string): PaneDocumentState {
    return { path, content, meta: {}, isDirty: false, reloadVersion: 0, revisionRail: createEmptyRevisionRailState() }
  }

  it('reveals only in the active pane resolved from layout state', () => {
    const bindings: PaneBindings = {
      primaryPane: makePane('docs/a.md', '# A'),
      secondaryPane: makePane('docs/b.md', '# B'),
      setPrimaryPane: () => {},
      setSecondaryPane: () => {},
    }
    const revealPrimary = vi.fn()
    const revealSecondary = vi.fn()
    const refs = {
      primary: { current: { flush: () => null, revealHeading: revealPrimary } },
      secondary: { current: { flush: () => null, revealHeading: revealSecondary } },
    }
    const workspace = new PaneWorkspace(makeLayout('secondary'), bindings, refs, vi.fn())
    const target = { ordinal: 0, level: 1 as const, text: 'B' }

    revealDocumentHeading(target, workspace)

    expect(revealSecondary).toHaveBeenCalledWith(target)
    expect(revealPrimary).not.toHaveBeenCalled()
  })
})
