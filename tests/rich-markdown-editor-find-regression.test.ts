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
