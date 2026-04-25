import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import Quill from 'quill'
import { getActiveMatchBounds } from '../src/features/project-editor/components/rich-markdown-editor-find-visual'
import { RichMarkdownEditor } from '../src/features/project-editor/components/rich-markdown-editor'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

describe('getActiveMatchBounds', () => {
  let host: HTMLDivElement
  let qlContainer: HTMLDivElement

  beforeEach(() => {
    host = document.createElement('div')
    qlContainer = document.createElement('div')
    qlContainer.className = 'ql-container'
    host.appendChild(qlContainer)

    host.getBoundingClientRect = () => new DOMRect(0, 0, 500, 500)
    qlContainer.getBoundingClientRect = () => new DOMRect(10, 10, 400, 400)
  })

  afterEach(() => {
    host.remove()
  })

  it('usa getBoundingClientRect en lugar de offsetTop/offsetLeft', () => {
    let usedOffsetTop = false
    Object.defineProperty(qlContainer, 'offsetTop', {
      get() {
        usedOffsetTop = true
        return 0
      },
      configurable: true,
    })
    Object.defineProperty(qlContainer, 'offsetLeft', {
      get() {
        usedOffsetTop = true
        return 0
      },
      configurable: true,
    })

    const getBounds = vi.fn(() => ({ top: 0, left: 0, width: 50, height: 20 }))
    const quill = {
      getBounds,
      getContents: () => ({ ops: [{ insert: 'hello world\n' }] }),
      getText: () => 'hello world\n',
    } as any

    getActiveMatchBounds(host, quill, 6, 5)

    expect(usedOffsetTop).toBe(false)
  })

  it('convierte offsets de texto plano a indices Quill cuando hay embeds antes del match', () => {
    const getBounds = vi.fn((_index: number, _length: number) => ({
      top: 0,
      left: 0,
      width: 50,
      height: 20,
    }))

    const quill = {
      getBounds,
      getContents: () => ({
        ops: [
          { insert: { tramaDirective: 'pagebreak' } },
          { insert: 'hello world\n' },
        ],
      }),
      getText: () => 'hello world\n',
    } as any

    // "world" empieza en offset 6 del texto plano
    // El embed ocupa 1 en el delta, asi que el indice Quill debe ser 7
    getActiveMatchBounds(host, quill, 6, 5)

    expect(getBounds).toHaveBeenCalledWith(7, 5)
  })

  it('devuelve null cuando la longitud convertida es cero', () => {
    const getBounds = vi.fn(() => ({ top: 0, left: 0, width: 50, height: 20 }))

    const quill = {
      getBounds,
      getContents: () => ({
        ops: [{ insert: '' }],
      }),
      getText: () => '',
    } as any

    const result = getActiveMatchBounds(host, quill, 0, 0)

    expect(result).toBeNull()
    expect(getBounds).not.toHaveBeenCalled()
  })
})

describe('RichMarkdownEditor find scroll regression', () => {
  let root: HTMLDivElement

  beforeEach(() => {
    if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
      ;(Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
        () => new DOMRect(0, 0, 0, 0)
    }

    root = document.createElement('div')
    document.body.appendChild(root)
  })

  afterEach(() => {
    root.remove()
  })

  it('recalcula activeBounds al hacer scroll en ql-container (no queda fijo en pantalla)', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'scroll-test',
          value: 'hello world',
          disabled: false,
          onChange: () => {},
          saveDisabled: false,
          saveLabel: 'Guardar',
          onSaveNow: () => {},
          syncState: 'clean',
          syncStateLabel: 'Sin cambios',
        }),
        root,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(root)
    const getBoundsSpy = vi.spyOn(editor, 'getBounds').mockReturnValue({
      top: 10,
      left: 10,
      width: 50,
      height: 20,
    } as any)

    act(() => {
      editor.focus()
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }),
      )
    })
    await sleep(30)

    const input = root.querySelector('.editor-findbar__input') as HTMLInputElement
    expect(input).toBeTruthy()

    act(() => {
      input.value = 'hello'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await sleep(30)

    // getBounds debe haber sido llamado al renderizar el highlight activo
    expect(getBoundsSpy.mock.calls.length).toBeGreaterThan(0)

    const callCountBeforeScroll = getBoundsSpy.mock.calls.length

    // Disparar scroll en ql-container
    const qlContainer = root.querySelector('.ql-container') as HTMLDivElement
    act(() => {
      qlContainer.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    await sleep(30)

    // getBounds debe haber sido llamado de nuevo porque el scroll forzo re-render
    expect(getBoundsSpy.mock.calls.length).toBeGreaterThan(callCountBeforeScroll)

    getBoundsSpy.mockRestore()
  })
})

describe('RichMarkdownEditor find & replace', () => {
  let root: HTMLDivElement

  const noop = () => {}

  const buildEditorProps = (
    overrides: Partial<Parameters<typeof RichMarkdownEditor>[0]> = {},
  ): Parameters<typeof RichMarkdownEditor>[0] => ({
    documentId: 'replace-test',
    value: '',
    disabled: false,
    onChange: noop,
    saveDisabled: false,
    saveLabel: 'Guardar',
    onSaveNow: noop,
    syncState: 'clean',
    syncStateLabel: 'Sin cambios',
    ...overrides,
  })

  beforeEach(() => {
    if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
      ;(Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
        () => new DOMRect(0, 0, 0, 0)
    }

    root = document.createElement('div')
    document.body.appendChild(root)
  })

  afterEach(() => {
    root.remove()
  })

  it('Ctrl+H opens find bar with replace row visible', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'ctrl-h-test', value: 'hello world hello' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const findbar = root.querySelector('.editor-findbar') as HTMLElement
    expect(findbar).toBeTruthy()
    expect(findbar.classList.contains('editor-findbar--replace')).toBe(true)

    const rows = root.querySelectorAll('.editor-findbar__row')
    expect(rows.length).toBe(2)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    expect(inputs.length).toBe(2)
    expect((inputs[1] as HTMLInputElement).placeholder).toBe('Replace')
  })

  it('Ctrl+F opens find bar without replace row', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'ctrl-f-test', value: 'hello world' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const findbar = root.querySelector('.editor-findbar') as HTMLElement
    expect(findbar).toBeTruthy()
    expect(findbar.classList.contains('editor-findbar--replace')).toBe(false)

    const rows = root.querySelectorAll('.editor-findbar__row')
    expect(rows.length).toBe(1)
  })

  it('toggle replace mode via chevron button shows/hides replace row', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'toggle-test', value: 'hello world hello' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    let findbar = root.querySelector('.editor-findbar') as HTMLElement
    expect(findbar.classList.contains('editor-findbar--replace')).toBe(false)

    const toggleBtn = root.querySelector('.editor-findbar__button--toggle-replace') as HTMLButtonElement
    expect(toggleBtn).toBeTruthy()

    act(() => { toggleBtn.click() })
    await sleep(20)

    findbar = root.querySelector('.editor-findbar') as HTMLElement
    expect(findbar.classList.contains('editor-findbar--replace')).toBe(true)

    act(() => { toggleBtn.click() })
    await sleep(20)

    findbar = root.querySelector('.editor-findbar') as HTMLElement
    expect(findbar.classList.contains('editor-findbar--replace')).toBe(false)
  })

  it('replace current match updates document text', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'replace-one', value: 'hello world hello' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    const findInput = inputs[0] as HTMLInputElement
    const replaceInput = inputs[1] as HTMLInputElement

    act(() => {
      findInput.value = 'hello'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    act(() => {
      replaceInput.value = 'hi'
      replaceInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    const replaceBtn = Array.from(root.querySelectorAll('.editor-findbar__button')).find(
      (btn) => btn.textContent === 'Replace',
    ) as HTMLButtonElement
    expect(replaceBtn).toBeTruthy()

    act(() => { replaceBtn.click() })
    await sleep(20)

    const text = editor.getText(0, Math.max(0, editor.getLength() - 1))
    expect(text).toBe('hi world hello')

    const count = root.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('1/1')
  })

  it('replace all matches updates all occurrences', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'replace-all', value: 'alpha beta alpha gamma alpha' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    const findInput = inputs[0] as HTMLInputElement
    const replaceInput = inputs[1] as HTMLInputElement

    act(() => {
      findInput.value = 'alpha'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    act(() => {
      replaceInput.value = 'zeta'
      replaceInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    const replaceAllBtn = Array.from(root.querySelectorAll('.editor-findbar__button')).find(
      (btn) => btn.textContent === 'Replace All',
    ) as HTMLButtonElement
    expect(replaceAllBtn).toBeTruthy()

    act(() => { replaceAllBtn.click() })
    await sleep(20)

    const text = editor.getText(0, Math.max(0, editor.getLength() - 1))
    expect(text).toBe('zeta beta zeta gamma zeta')

    const count = root.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('0/0')
  })

  it('replace with empty query does nothing', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'replace-empty', value: 'hello world' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    const replaceInput = inputs[1] as HTMLInputElement

    act(() => {
      replaceInput.value = 'test'
      replaceInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    const replaceBtn = Array.from(root.querySelectorAll('.editor-findbar__button')).find(
      (btn) => btn.textContent === 'Replace',
    ) as HTMLButtonElement

    act(() => { replaceBtn.click() })
    await sleep(20)

    const text = editor.getText(0, Math.max(0, editor.getLength() - 1))
    expect(text).toBe('hello world')
  })

  it('pressing Enter in replace input triggers replace', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'replace-enter', value: 'foo bar foo' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    const findInput = inputs[0] as HTMLInputElement
    const replaceInput = inputs[1] as HTMLInputElement

    act(() => {
      findInput.value = 'foo'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    act(() => {
      replaceInput.value = 'baz'
      replaceInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    act(() => {
      replaceInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await sleep(20)

    const text = editor.getText(0, Math.max(0, editor.getLength() - 1))
    expect(text).toBe('baz bar foo')
  })

  it('document change closes find and clears state', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'doc-a', value: 'hello world hello' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    const findInput = inputs[0] as HTMLInputElement
    expect(findInput).toBeTruthy()

    act(() => {
      findInput.value = 'hello'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'doc-b', value: 'other content' })),
        root,
      )
    })

    await sleep(50)

    const findbarAfter = root.querySelector('.editor-findbar') as HTMLElement | null
    expect(findbarAfter).toBeNull()
  })

  it('replace handles iteration with mixed case query (case-insensitive)', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'replace-case', value: 'Hello World hello HELLO' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    const findInput = inputs[0] as HTMLInputElement
    const replaceInput = inputs[1] as HTMLInputElement

    act(() => {
      findInput.value = 'hello'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    let count = root.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('1/3')

    act(() => {
      replaceInput.value = 'hi'
      replaceInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    const replaceAllBtn = Array.from(root.querySelectorAll('.editor-findbar__button')).find(
      (btn) => btn.textContent === 'Replace All',
    ) as HTMLButtonElement

    act(() => { replaceAllBtn.click() })
    await sleep(20)

    const text = editor.getText(0, Math.max(0, editor.getLength() - 1))
    expect(text).toBe('hi World hi hi')

    count = root.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('0/0')
  })

  it('after replacing all, no more matches remain and counter shows 0/0', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'replace-zero', value: 'one one one' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    const findInput = inputs[0] as HTMLInputElement

    act(() => {
      findInput.value = 'one'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    let count = root.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('1/3')

    const replaceAllBtn = Array.from(root.querySelectorAll('.editor-findbar__button')).find(
      (btn) => btn.textContent === 'Replace All',
    ) as HTMLButtonElement

    act(() => { replaceAllBtn.click() })
    await sleep(20)

    count = root.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('0/0')

    const highlight = root.querySelector('.editor-find-highlight')
    expect(highlight).toBeNull()
  })

  it('partial match does not trigger replacement in substrings', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'replace-partial', value: 'theatre theater' })),
        root,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(root)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const inputs = root.querySelectorAll('.editor-findbar__input')
    const findInput = inputs[0] as HTMLInputElement
    const replaceInput = inputs[1] as HTMLInputElement

    act(() => {
      findInput.value = 'theater'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    let count = root.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('1/1')

    act(() => {
      replaceInput.value = 'cinema'
      replaceInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)

    const replaceBtn = Array.from(root.querySelectorAll('.editor-findbar__button')).find(
      (btn) => btn.textContent === 'Replace',
    ) as HTMLButtonElement

    act(() => { replaceBtn.click() })
    await sleep(20)

    const text = editor.getText(0, Math.max(0, editor.getLength() - 1))
    expect(text).toBe('theatre cinema')
    expect(text).not.toContain('theater')
  })
})
