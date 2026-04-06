import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Fragment, h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useState } from 'preact/hooks'
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

  it('sin Highlights API usa enfasis de bloque sin overlay', async () => {
    globalAny.CSS = { ...(globalAny.CSS ?? {}) }
    delete (globalAny.CSS as { highlights?: unknown }).highlights
    delete globalAny.Highlight

    act(() => {
      render(h(RichMarkdownEditor, buildProps()), container)
    })

    await sleep(120)

    const editorRoot = container.querySelector('.ql-editor') as HTMLElement
    const emphasized = editorRoot.querySelector('.is-focus-emphasis')
    expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(false)
    expect(editorRoot.classList.contains('is-focus-overlay-visible')).toBe(false)
    expect(emphasized).toBeTruthy()
  })

  it('mantiene marcador de highlight al cambiar scope y lo limpia al salir de inline focus', async () => {
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

    function TestHarness() {
      const [focusScope, setFocusScope] = useState<'sentence' | 'line' | 'paragraph'>('sentence')
      const [focusModeEnabled, setFocusModeEnabled] = useState(true)

      return h(Fragment, null, [
        h(RichMarkdownEditor, buildProps({
          value: 'Primera frase. Segunda frase para cambiar el foco.',
          focusScope,
          focusModeEnabled,
        })),
        h('button', {
          id: 'scope-line',
          onClick: () => setFocusScope('line'),
          textContent: 'Line',
        }),
        h('button', {
          id: 'scope-paragraph',
          onClick: () => setFocusScope('paragraph'),
          textContent: 'Paragraph',
        }),
        h('button', {
          id: 'toggle-focus',
          onClick: () => setFocusModeEnabled((enabled) => !enabled),
          textContent: 'Toggle Focus',
        }),
      ])
    }

    act(() => {
      render(h(TestHarness, {}), container)
    })

    await sleep(120)

    const editorRoot = container.querySelector('.ql-editor') as HTMLElement
    expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(true)
    expect(setHighlight).toHaveBeenCalled()

    const lineButton = container.querySelector('#scope-line') as HTMLButtonElement
    act(() => {
      lineButton.click()
    })
    await sleep(80)

    expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(true)

    const paragraphButton = container.querySelector('#scope-paragraph') as HTMLButtonElement
    act(() => {
      paragraphButton.click()
    })
    await sleep(80)

    expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(false)
    expect(deleteHighlight).toHaveBeenCalled()

    const toggleButton = container.querySelector('#toggle-focus') as HTMLButtonElement
    act(() => {
      toggleButton.click()
    })
    await sleep(80)

    expect(editorRoot.classList.contains('is-focus-mode')).toBe(false)
    expect(editorRoot.classList.contains('is-focus-text-highlight')).toBe(false)
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
