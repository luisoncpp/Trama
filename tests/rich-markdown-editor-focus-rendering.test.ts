import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import Quill from 'quill'
import { RichMarkdownEditor } from '../src/features/project-editor/components/rich-markdown-editor'

describe('RichMarkdownEditor focus rendering regression', () => {
  let container: HTMLDivElement
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const noop = () => {}
  const globalAny = globalThis as unknown as {
    CSS?: Record<string, unknown>
    Highlight?: new (...ranges: Range[]) => unknown
  }
  const originalCSS = globalAny.CSS
  const originalHighlight = globalAny.Highlight

  const buildProps = (
    overrides: Partial<Parameters<typeof RichMarkdownEditor>[0]> = {},
  ): Parameters<typeof RichMarkdownEditor>[0] => ({
    documentId: 'focus-regression-doc',
    value: 'Primera frase. Segunda frase para probar foco.',
    disabled: false,
    onChange: noop,
    saveDisabled: false,
    saveLabel: 'Guardar',
    onSaveNow: noop,
    syncState: 'clean',
    syncStateLabel: 'Sin cambios',
    focusModeEnabled: true,
    focusScope: 'sentence',
    ...overrides,
  })

  function getQuillInstance(root: ParentNode): Quill {
    const quillContainer = root.querySelector('.ql-container')
    if (!quillContainer) {
      throw new Error('No se encontro instancia de Quill en el DOM de prueba')
    }

    const found = Quill.find(quillContainer, true)
    if (!found || !(found instanceof Quill)) {
      throw new Error('No se encontro instancia de Quill en el DOM de prueba')
    }

    return found
  }

  beforeEach(() => {
    if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
      ;(Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
        () => new DOMRect(0, 0, 0, 0)
    }

    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    document.body.removeChild(container)

    globalAny.CSS = originalCSS
    if (originalHighlight) {
      globalAny.Highlight = originalHighlight
    } else {
      delete globalAny.Highlight
    }
  })

  it('prioriza CSS Highlights API cuando esta disponible', async () => {
    const setHighlight = vi.fn()
    const deleteHighlight = vi.fn()
    globalAny.CSS = {
      ...(globalAny.CSS ?? {}),
      highlights: {
        set: setHighlight,
        delete: deleteHighlight,
      },
    }
    globalAny.Highlight = class MockHighlight {
      constructor(..._ranges: Range[]) {}
    }

    act(() => {
      render(h(RichMarkdownEditor, buildProps()), container)
    })

    await sleep(120)

    const editorRoot = container.querySelector('.ql-editor') as HTMLElement
    expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(true)
    expect(editorRoot.classList.contains('is-focus-overlay-visible')).toBe(false)
    expect(setHighlight).toHaveBeenCalledWith('trama-focus-scope', expect.anything())
  })

  it('cae a overlay geometrico cuando Highlights API no existe', async () => {
    globalAny.CSS = { ...(globalAny.CSS ?? {}) }
    delete (globalAny.CSS as { highlights?: unknown }).highlights
    delete globalAny.Highlight

    act(() => {
      render(h(RichMarkdownEditor, buildProps()), container)
    })

    await sleep(120)

    const editorRoot = container.querySelector('.ql-editor') as HTMLElement
    expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(false)
    expect(editorRoot.classList.contains('is-focus-overlay-visible')).toBe(true)
  })

  it('no muta contenido al recalcular foco repetidamente', async () => {
    globalAny.CSS = { ...(globalAny.CSS ?? {}) }
    delete (globalAny.CSS as { highlights?: unknown }).highlights
    delete globalAny.Highlight

    act(() => {
      render(
        h(RichMarkdownEditor, buildProps({
          value: 'Una linea bastante larga para simular recalculos de foco sin tocar el contenido.',
          focusScope: 'line',
        })),
        container,
      )
    })

    await sleep(120)

    const editor = getQuillInstance(container)
    const before = editor.getText()
    const beforeNewLines = (before.match(/\n/g) ?? []).length

    for (let index = 1; index <= 16; index += 1) {
      const target = Math.min(index * 2, Math.max(0, editor.getLength() - 1))
      act(() => {
        editor.setSelection(target, 0, 'silent')
      })
      await sleep(16)
    }

    const after = editor.getText()
    const afterNewLines = (after.match(/\n/g) ?? []).length
    expect(after).toBe(before)
    expect(afterNewLines).toBe(beforeNewLines)
  })
})
