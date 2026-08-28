import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorSessionImpl } from '../src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-lifecycle'
import { LayoutDirectiveController } from '../src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/layout-directive-controller'
import {
  readLiveQuillRange,
  readStableQuillRange,
  registerContextMenuSelectionPreserve,
} from '../src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-contextmenu-selection'
import { selectAllInEditor } from '../src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-select-all'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../src/shared/workspace-context-menu'

type QuillWithSelection = {
  selection: { update: (source?: string) => void; lastRange: { index: number; length: number } | null }
}

let host: HTMLDivElement

beforeEach(() => {
  LayoutDirectiveController.register()
  if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
    ;(Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
      () => new DOMRect(0, 0, 0, 0)
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  host.remove()
})

function createSession(value: string): EditorSessionImpl {
  return new EditorSessionImpl({
    host,
    documentId: 'contextmenu-selection-doc',
    value,
    spellcheckEnabled: false,
    onChangeRef: { current: () => {} },
    onDirtyRef: { current: () => {} },
  })
}

function collapseNativeSelection(editor: NonNullable<ReturnType<EditorSessionImpl['getEditor']>>): void {
  window.getSelection()?.removeAllRanges()
  ;(editor as unknown as QuillWithSelection).selection.update('user')
}

const centeredFirstRowMarkdown = [
  '<!-- trama:center:start -->',
  'Centered first row',
  '<!-- trama:center:end -->',
  '',
  'Second row left aligned',
].join('\n')

describe('registerContextMenuSelectionPreserve', () => {
  it('restores a selection that spans leading center embeds after contextmenu + native collapse', () => {
    const session = createSession(centeredFirstRowMarkdown)
    const editor = session.getEditor()!
    const selectLength = Math.max(0, editor.getLength() - 1)
    editor.setSelection(0, selectLength, 'silent')
    const expected = readStableQuillRange(editor)
    expect(expected?.length).toBeGreaterThan(0)

    editor.root.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    collapseNativeSelection(editor)
    vi.advanceTimersByTime(100)

    expect(readLiveQuillRange(editor)).toEqual(expected)
    session.dispose()
  })

  it('restores after Quill-owned select-all then right-mousedown collapse', () => {
    const session = createSession(centeredFirstRowMarkdown)
    const editor = session.getEditor()!
    editor.focus()
    selectAllInEditor(editor)
    const expected = readStableQuillRange(editor)
    expect(expected?.index).toBe(0)
    expect(expected?.length).toBeGreaterThan(0)

    editor.root.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 2 }))
    collapseNativeSelection(editor)
    vi.advanceTimersByTime(100)

    expect(readLiveQuillRange(editor)).toEqual(expected)
    session.dispose()
  })

  it('re-applies stashed range on selection-change collapse during the grace window', () => {
    const session = createSession(centeredFirstRowMarkdown)
    const editor = session.getEditor()!
    selectAllInEditor(editor)
    const expected = readStableQuillRange(editor)

    editor.root.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 2 }))
    collapseNativeSelection(editor)

    expect(readLiveQuillRange(editor)).toEqual(expected)
    session.dispose()
  })

  it('does not restore when the caret is collapsed on contextmenu', () => {
    const session = createSession(centeredFirstRowMarkdown)
    const editor = session.getEditor()!
    editor.setSelection(2, 0, 'silent')

    editor.root.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    collapseNativeSelection(editor)
    expect(readLiveQuillRange(editor)).toBeNull()

    vi.advanceTimersByTime(100)

    expect(readLiveQuillRange(editor)).toBeNull()
    session.dispose()
  })

  it('unregister stops restoring after the listener is removed', () => {
    const session = createSession(centeredFirstRowMarkdown)
    const editor = session.getEditor()!
    session.dispose()

    const unregister = registerContextMenuSelectionPreserve(editor)
    unregister()

    const selectLength = Math.max(0, editor.getLength() - 1)
    editor.setSelection(0, selectLength, 'silent')
    editor.root.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    collapseNativeSelection(editor)
    vi.advanceTimersByTime(100)

    expect(readLiveQuillRange(editor)).toBeNull()
  })
})

describe('select-all workspace command', () => {
  it('selects the full Quill document when the editor is focused', () => {
    const session = createSession(centeredFirstRowMarkdown)
    const editor = session.getEditor()!
    editor.focus()
    editor.setSelection(2, 0, 'silent')

    window.dispatchEvent(
      new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'select-all' } }),
    )

    const range = readLiveQuillRange(editor)
    expect(range?.index).toBe(0)
    expect(range?.length).toBe(Math.max(0, editor.getLength() - 1))
    session.dispose()
  })
})
