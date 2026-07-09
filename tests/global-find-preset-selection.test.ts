import { describe, expect, it, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import Quill from 'quill'
import { RichMarkdownEditor } from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor'
import { postGlobalFindRequest, clearGlobalFindRequest } from '../src/features/project-editor/global-search/index.ts'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const noop = () => {}

// 'target' starts at plain-text offset 11 in this body and appears twice.
const TARGET_BODY = 'intro text target more target'
const TARGET_RANGE: [number, number, string] = [11, 6, 'silent']

function getQuillInstance(root: ParentNode): Quill {
  const quillContainer = root.querySelector('.ql-container')
  if (!quillContainer) {
    throw new Error('No se encontro instancia de Quill')
  }
  const found = Quill.find(quillContainer, true)
  if (!found || !(found instanceof Quill)) {
    throw new Error('No se encontro instancia de Quill')
  }
  return found
}

function expectRevealedFirstMatch(root: ParentNode, setSelectionSpy: MockInstance) {
  const input = root.querySelector('.editor-findbar__input') as HTMLInputElement
  expect(input).toBeTruthy()
  expect(input.value).toBe('target')

  const count = root.querySelector('.editor-findbar__count') as HTMLSpanElement
  expect(count.textContent).toBe('1/2')

  expect(setSelectionSpy.mock.calls).toContainEqual(TARGET_RANGE)
  expect(root.querySelector('.editor-find-highlight')).toBeTruthy()
}

const buildEditorProps = (
  overrides: Partial<Parameters<typeof RichMarkdownEditor>[0]> = {},
): Parameters<typeof RichMarkdownEditor>[0] => ({
  documentId: 'book/a.md',
  value: '',
  disabled: false,
  onChange: noop,
  historyBackDisabled: true,
  onHistoryBack: noop,
  saveDisabled: false,
  saveLabel: 'Guardar',
  onSaveNow: noop,
  revertDisabled: true,
  revertLabel: '',
  onRevertNow: noop,
  syncState: 'clean',
  syncStateLabel: 'Sin cambios',
  ...overrides,
})

describe('global find preset selection', () => {
  let root: HTMLDivElement

  beforeEach(() => {
    if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
      ;(Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
        () => new DOMRect(0, 0, 0, 0)
    }

    root = document.createElement('div')
    document.body.appendChild(root)
    clearGlobalFindRequest()
  })

  afterEach(() => {
    act(() => {
      render(null, root)
    })
    clearGlobalFindRequest()
    root.remove()
  })

  it('reveals the first match when the target document was already open', async () => {
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/a.md', value: TARGET_BODY })), root)
    })
    await sleep(80)

    const editor = getQuillInstance(root)
    const setSelectionSpy = vi.spyOn(editor, 'setSelection')

    act(() => {
      postGlobalFindRequest({ path: 'book/a.md', query: 'target', options: { caseSensitive: false, wholeWord: false } })
    })
    await sleep(50)

    expectRevealedFirstMatch(root, setSelectionSpy)
  })

  it('reveals the first match when the document loads after navigation (disabled while loading)', async () => {
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/a.md', value: 'other document' })), root)
    })
    await sleep(80)

    act(() => {
      postGlobalFindRequest({ path: 'book/b.md', query: 'target', options: { caseSensitive: false, wholeWord: false } })
    })

    // Navigation assigns the new path to the pane while the document is still loading.
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: '', disabled: true })), root)
    })
    await sleep(80)

    const editor = getQuillInstance(root)
    const setSelectionSpy = vi.spyOn(editor, 'setSelection')

    // Document content arrives while the editor is still disabled (loadingDocument).
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: TARGET_BODY, disabled: true })), root)
    })
    await sleep(50)

    // Loading finishes and the editor becomes enabled: the reveal must be re-asserted.
    setSelectionSpy.mockClear()
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: TARGET_BODY, disabled: false })), root)
    })
    await sleep(50)

    expectRevealedFirstMatch(root, setSelectionSpy)
  })

  it('reveals the first match when content and enablement arrive in the same render', async () => {
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/a.md', value: 'other document' })), root)
    })
    await sleep(80)

    act(() => {
      postGlobalFindRequest({ path: 'book/b.md', query: 'target', options: { caseSensitive: false, wholeWord: false } })
    })

    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: '', disabled: true })), root)
    })
    await sleep(80)

    const editor = getQuillInstance(root)
    const setSelectionSpy = vi.spyOn(editor, 'setSelection')

    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: TARGET_BODY, disabled: false })), root)
    })
    await sleep(50)

    expectRevealedFirstMatch(root, setSelectionSpy)
  })

  it('applies the preset when the find bar was already open with another query before navigating', async () => {
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/a.md', value: 'alpha beta alpha' })), root)
    })
    await sleep(80)

    // Open local find on the current document and type a query.
    const editorA = getQuillInstance(root)
    act(() => {
      editorA.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })
    await sleep(30)
    const previousInput = root.querySelector('.editor-findbar__input') as HTMLInputElement
    act(() => {
      previousInput.value = 'alpha'
      previousInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await sleep(30)
    expect((root.querySelector('.editor-findbar__count') as HTMLSpanElement).textContent).toBe('1/2')

    // Click a global search result for a document that is not open.
    act(() => {
      postGlobalFindRequest({ path: 'book/b.md', query: 'target', options: { caseSensitive: false, wholeWord: false } })
    })
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: '', disabled: true })), root)
    })
    await sleep(80)

    // The preset query must survive the same-flush match refresh (regression: it was
    // clobbered back to the previous query when the find bar was already open).
    expect((root.querySelector('.editor-findbar__input') as HTMLInputElement).value).toBe('target')

    const editor = getQuillInstance(root)
    const setSelectionSpy = vi.spyOn(editor, 'setSelection')

    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: TARGET_BODY, disabled: false })), root)
    })
    await sleep(50)

    expectRevealedFirstMatch(root, setSelectionSpy)
  })

  it('reattaches active highlight scroll tracking after navigating with find already open', async () => {
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/a.md', value: 'alpha beta alpha' })), root)
    })
    await sleep(80)

    const editorA = getQuillInstance(root)
    act(() => {
      editorA.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })
    await sleep(30)

    const previousInput = root.querySelector('.editor-findbar__input') as HTMLInputElement
    act(() => {
      previousInput.value = 'alpha'
      previousInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await sleep(30)

    act(() => {
      postGlobalFindRequest({ path: 'book/b.md', query: 'target', options: { caseSensitive: false, wholeWord: false } })
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: TARGET_BODY, disabled: false })), root)
    })
    await sleep(80)

    const editorB = getQuillInstance(root)
    const getBoundsSpy = vi.spyOn(editorB, 'getBounds').mockReturnValue({
      top: 10,
      left: 10,
      width: 50,
      height: 20,
    } as any)

    act(() => {
      editorB.container.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    await sleep(30)

    expect(getBoundsSpy.mock.calls.length).toBeGreaterThan(0)
    getBoundsSpy.mockRestore()
  })

  it('refreshes the preset query after fast navigation while the find bar was already open without a query', async () => {
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/a.md', value: 'alpha beta alpha' })), root)
    })
    await sleep(80)

    const editorA = getQuillInstance(root)
    act(() => {
      editorA.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })
    await sleep(30)

    const setSelectionSpy = vi.spyOn(Quill.prototype, 'setSelection')

    act(() => {
      postGlobalFindRequest({ path: 'book/b.md', query: 'target', options: { caseSensitive: false, wholeWord: false } })
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/b.md', value: TARGET_BODY, disabled: false })), root)
    })
    await sleep(80)

    expectRevealedFirstMatch(root, setSelectionSpy)
    setSelectionSpy.mockRestore()
  })

  it('re-asserts the reveal after layout settles (late content shifts)', async () => {
    act(() => {
      render(h(RichMarkdownEditor, buildEditorProps({ documentId: 'book/a.md', value: TARGET_BODY })), root)
    })
    await sleep(80)

    const editor = getQuillInstance(root)
    const setSelectionSpy = vi.spyOn(editor, 'setSelection')

    act(() => {
      postGlobalFindRequest({ path: 'book/a.md', query: 'target', options: { caseSensitive: false, wholeWord: false } })
    })
    await sleep(30)

    const countTargetReveals = () =>
      (setSelectionSpy.mock.calls as unknown[][]).filter(
        (call) => call[0] === TARGET_RANGE[0] && call[1] === TARGET_RANGE[1],
      ).length

    const callsAfterFirstPass = countTargetReveals()
    expect(callsAfterFirstPass).toBeGreaterThan(0)

    // The settle pass (150ms) must re-assert the same reveal to survive late layout shifts.
    await sleep(200)
    expect(countTargetReveals()).toBeGreaterThan(callsAfterFirstPass)
  })
})
