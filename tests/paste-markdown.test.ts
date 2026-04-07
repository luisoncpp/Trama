import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h, render, Fragment } from 'preact'
import { act } from 'preact/test-utils'
import Quill from 'quill'
import { RichMarkdownEditor } from '../src/features/project-editor/components/rich-markdown-editor'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../src/shared/workspace-context-menu'

describe('Paste Markdown workspace command', () => {
  let container: HTMLDivElement
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const noop = () => {}

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
    // cleanup any clipboard mock
    try {
      if ((navigator as any).clipboard && (navigator as any)._origClipboard) {
        ;(navigator as any).clipboard = (navigator as any)._origClipboard
      }
    } catch {
      // ignore
    }
  })

  it('pega markdown cuando el editor tiene foco', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'paste-doc',
          value: '',
          disabled: false,
          onChange: noop,
          saveDisabled: false,
          saveLabel: 'Guardar',
          onSaveNow: noop,
          syncState: 'clean',
          syncStateLabel: 'Sin cambios',
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)

    // Mock clipboard
    const markdown = '# Hola Mundo\n\n**fuerte**'
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { readText: async () => markdown }

    act(() => {
      editor.focus()
    })

    await sleep(10)

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'paste-markdown' } }))
    })

    await sleep(60)

    const text = editor.getText().trim()
    expect(text).toContain('Hola Mundo')
    expect(text).toContain('fuerte')

    const html = editor.root.innerHTML
    expect(html).toContain('<h1')
  })

  it('no pega si el editor no tiene foco', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'paste-doc-2',
          value: '',
          disabled: false,
          onChange: noop,
          saveDisabled: false,
          saveLabel: 'Guardar',
          onSaveNow: noop,
          syncState: 'clean',
          syncStateLabel: 'Sin cambios',
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)

    const markdown = '# Sin Foco'
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { readText: async () => markdown }

    // Ensure editor is not focused
    act(() => {
      editor.blur()
    })

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'paste-markdown' } }))
    })

    await sleep(60)

    const text = editor.getText().trim()
    expect(text).toBe('')
  })
})
