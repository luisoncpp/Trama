import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import Quill from 'quill'
import { RichMarkdownEditor } from '../src/features/project-editor/components/rich-markdown-editor'

describe('RichMarkdownEditor focus rendering', () => {
  let container: HTMLDivElement
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const noop = () => {}

  const buildEditorProps = (
    overrides: Partial<Parameters<typeof RichMarkdownEditor>[0]> = {},
  ): Parameters<typeof RichMarkdownEditor>[0] => ({
    documentId: 'test-doc',
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
    document.body.removeChild(container)
  })

  it('prioriza CSS Highlights API sobre overlay en scope sentence', async () => {
    const previousCss = (globalThis as unknown as { CSS?: unknown }).CSS
    const previousHighlight = (globalThis as unknown as { Highlight?: unknown }).Highlight
    const set = vi.fn()
    const del = vi.fn()

    class FakeHighlight {
      constructor(..._ranges: Range[]) {}
    }

    ;(globalThis as unknown as { CSS: { highlights: { set: typeof set; delete: typeof del } } }).CSS = {
      highlights: { set, delete: del },
    }
    ;(globalThis as unknown as { Highlight: typeof FakeHighlight }).Highlight = FakeHighlight

    try {
      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'focus-highlight-doc',
            value: 'Primera frase. Segunda frase visible para foco.',
            focusModeEnabled: true,
            focusScope: 'sentence',
          })),
          container,
        )
      })

      await sleep(100)

      const editorRoot = container.querySelector('.ql-editor') as HTMLElement
      expect(editorRoot).toBeDefined()
      expect(set).toHaveBeenCalled()
      expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(true)
      expect(editorRoot.classList.contains('is-focus-overlay-visible')).toBe(false)
    } finally {
      ;(globalThis as unknown as { CSS?: unknown }).CSS = previousCss
      ;(globalThis as unknown as { Highlight?: unknown }).Highlight = previousHighlight
    }
  })

  it('usa overlay fallback cuando CSS Highlights API no esta disponible', async () => {
    const previousCss = (globalThis as unknown as { CSS?: unknown }).CSS
    const previousHighlight = (globalThis as unknown as { Highlight?: unknown }).Highlight

    ;(globalThis as unknown as { CSS: Record<string, never> }).CSS = {}
    ;(globalThis as unknown as { Highlight?: unknown }).Highlight = undefined

    try {
      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'focus-overlay-doc',
            value: 'Texto de prueba para fallback de overlay en foco.',
            focusModeEnabled: true,
            focusScope: 'line',
          })),
          container,
        )
      })

      await sleep(100)

      const editorRoot = container.querySelector('.ql-editor') as HTMLElement
      expect(editorRoot).toBeDefined()
      expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(false)
      expect(editorRoot.classList.contains('is-focus-overlay-visible')).toBe(true)
    } finally {
      ;(globalThis as unknown as { CSS?: unknown }).CSS = previousCss
      ;(globalThis as unknown as { Highlight?: unknown }).Highlight = previousHighlight
    }
  })

  it('no muta la estructura de bloques del editor al refrescar foco', async () => {
    const previousCss = (globalThis as unknown as { CSS?: unknown }).CSS
    const previousHighlight = (globalThis as unknown as { Highlight?: unknown }).Highlight

    ;(globalThis as unknown as { CSS: Record<string, never> }).CSS = {}
    ;(globalThis as unknown as { Highlight?: unknown }).Highlight = undefined

    try {
      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'focus-dom-stability-doc',
            value: 'Linea uno para foco.\n\nLinea dos para foco.',
            focusModeEnabled: true,
            focusScope: 'line',
          })),
          container,
        )
      })

      await sleep(100)

      const editorRoot = container.querySelector('.ql-editor') as HTMLElement
      const initialChildren = editorRoot.childElementCount
      const editor = getQuillInstance(container)

      for (let index = 0; index < 6; index += 1) {
        act(() => {
          editor.setSelection(Math.min(index, Math.max(0, editor.getLength() - 1)), 0, 'silent')
        })

        await sleep(10)
      }

      expect(editorRoot.childElementCount).toBe(initialChildren)
    } finally {
      ;(globalThis as unknown as { CSS?: unknown }).CSS = previousCss
      ;(globalThis as unknown as { Highlight?: unknown }).Highlight = previousHighlight
    }
  })
})
