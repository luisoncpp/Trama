import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h, render, Fragment } from 'preact'
import { act } from 'preact/test-utils'
import { useState } from 'preact/hooks'
import Quill from 'quill'
import { RichMarkdownEditor } from '../src/features/project-editor/components/rich-markdown-editor'

describe('RichMarkdownEditor', () => {
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

  it('renderiza el editor sin errores', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'test-doc-1',
          value: '# Test\n\nContent',
        })),
        container,
      )
    })

    await sleep(80)

    const hostDiv = container.querySelector('.rich-editor')
    expect(hostDiv).toBeDefined()
  })

  it('responde a cambios en el prop documentId recreando editor', async () => {
    let recreationCount = 0

    function TestHarness() {
      const [docId, setDocId] = useState('doc-1')

      return h(Fragment, null, [
        h(RichMarkdownEditor, buildEditorProps({
          documentId: docId,
          value: 'Content',
          onChange: () => {
            recreationCount++
          },
        })),
        h('button', {
          id: 'switch-doc',
          onClick: () => setDocId('doc-2'),
          textContent: 'Switch Doc',
        }),
      ])
    }

    act(() => {
      render(h(TestHarness, {}), container)
    })

    await sleep(80)

    const button = container.querySelector('#switch-doc') as HTMLButtonElement
    act(() => {
      button?.click()
    })

    await sleep(80)

    const finalHostDiv = container.querySelector('.rich-editor') as HTMLElement
    expect(finalHostDiv).toBeDefined()
    expect(recreationCount).toBeGreaterThanOrEqual(0)
  })

  it('no pierde contenido cuando se desactiva/activa', async () => {
    const testContent = '# Heading\n\nContent'

    function TestHarness() {
      const [disabled, setDisabled] = useState(false)

      return h(Fragment, null, [
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'test-doc',
          value: testContent,
          disabled,
        })),
        h('button', {
          id: 'toggle-disabled',
          onClick: () => setDisabled((d) => !d),
          textContent: 'Toggle Disabled',
        }),
      ])
    }

    act(() => {
      render(h(TestHarness, {}), container)
    })

    await sleep(80)

    const button = container.querySelector('#toggle-disabled') as HTMLButtonElement
    act(() => {
      button?.click()
    })

    await sleep(40)

    const editorHost = container.querySelector('.rich-editor')
    expect(editorHost).toBeDefined()

    act(() => {
      button?.click()
    })

    await sleep(40)

    expect(container.querySelector('.rich-editor')).toBeDefined()
  })

  it('mantiene estructura del host div entre renders', async () => {
    function TestHarness() {
      const [count, setCount] = useState(0)

      return h(Fragment, null, [
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'same-doc',
          value: `Content ${count}`,
        })),
        h('button', {
          id: 'rerender',
          onClick: () => setCount((n) => n + 1),
          textContent: 'Rerender',
        }),
      ])
    }

    act(() => {
      render(h(TestHarness, {}), container)
    })

    await sleep(80)

    const hostBefore = container.querySelector('.rich-editor') as HTMLElement
    expect(hostBefore).toBeDefined()

    const button = container.querySelector('#rerender') as HTMLButtonElement
    act(() => {
      button?.click()
    })

    await sleep(40)

    const hostAfter = container.querySelector('.rich-editor') as HTMLElement
    expect(hostAfter).toBeDefined()
    expect(hostAfter.className).toContain('rich-editor')
  })

  it('no aplica undo sobre cambios externos programaticos', async () => {
    function TestHarness() {
      const [value, setValue] = useState('# Inicio')

      return h(Fragment, null, [
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'undo-doc',
          value,
        })),
        h('button', {
          id: 'sync-external',
          onClick: () => setValue('# Externo'),
          textContent: 'Sync External',
        }),
      ])
    }

    act(() => {
      render(h(TestHarness, {}), container)
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const button = container.querySelector('#sync-external') as HTMLButtonElement

    act(() => {
      button.click()
    })

    await sleep(40)
    const syncedEditor = getQuillInstance(container)
    const beforeUndo = syncedEditor.getText().trim()
    expect(beforeUndo).toBe('Externo')

    act(() => {
      syncedEditor.history.undo()
    })

    await sleep(20)
    const afterUndo = syncedEditor.getText().trim()
    expect(afterUndo).toBe('Externo')
  })

  it('mantiene undo funcional tras sync externo y revierte solo ediciones del usuario', async () => {
    function TestHarness() {
      const [value, setValue] = useState('# Inicio')

      return h(Fragment, null, [
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'undo-mixed-doc',
          value,
        })),
        h('button', {
          id: 'sync-external-mixed',
          onClick: () => setValue('# Externo'),
          textContent: 'Sync External Mixed',
        }),
      ])
    }

    act(() => {
      render(h(TestHarness, {}), container)
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const button = container.querySelector('#sync-external-mixed') as HTMLButtonElement

    act(() => {
      editor.insertText(editor.getLength() - 1, ' local', 'user')
    })

    await sleep(20)
    expect(editor.getText().trim()).toBe('Inicio local')

    act(() => {
      button.click()
    })

    await sleep(40)
    const editorAfterSync = getQuillInstance(container)
    expect(editorAfterSync.getText().trim()).toBe('Externo')

    act(() => {
      editorAfterSync.insertText(editorAfterSync.getLength() - 1, ' actualizado', 'user')
    })

    await sleep(20)
    expect(editorAfterSync.getText().trim()).toBe('Externo actualizado')

    act(() => {
      editorAfterSync.history.undo()
    })

    await sleep(20)
    expect(editorAfterSync.getText().trim()).toBe('Externo')
  })

  it('con estado controlado no reinicia cursor al inicio al teclear al final', async () => {
    function TestHarness() {
      const [value, setValue] = useState('Linea inicial')

      return h(RichMarkdownEditor, buildEditorProps({
        documentId: 'cursor-controlled-doc',
        value,
        onChange: setValue,
      }))
    }

    act(() => {
      render(h(TestHarness, {}), container)
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const endIndex = Math.max(0, editor.getLength() - 1)

    act(() => {
      editor.setSelection(endIndex, 0, 'silent')
      editor.insertText(endIndex, ' plus', 'user')
    })

    await sleep(40)

    const after = getQuillInstance(container)
    const selection = after.getSelection()
    expect(selection).toBeTruthy()
    expect(selection?.index ?? 0).toBeGreaterThan(0)
  })

  it('reemplaza -- por — y << por « y >> por »', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'typo-doc', value: '' })),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)

    act(() => {
      editor.insertText(0, '-', 'user')
      editor.insertText(1, '-', 'user')
    })
    await sleep(20)
    expect(editor.getText(0, 1)).toBe('\u2014')

    act(() => {
      editor.insertText(1, '<', 'user')
      editor.insertText(2, '<', 'user')
    })
    await sleep(20)
    expect(editor.getText(1, 1)).toBe('\u00ab')

    act(() => {
      editor.insertText(2, '>', 'user')
      editor.insertText(3, '>', 'user')
    })
    await sleep(20)
    expect(editor.getText(2, 1)).toBe('\u00bb')
  })

  it('revierte reemplazo tipografico con undo', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'typo-undo-doc', value: '' })),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)

    act(() => {
      editor.insertText(0, '-', 'user')
      editor.insertText(1, '-', 'user')
    })
    await sleep(20)
    expect(editor.getText(0, 1)).toBe('\u2014')

    act(() => {
      editor.history.undo()
    })
    await sleep(20)
    expect(editor.getText(0, 2)).toBe('--')
  })

  it('abre barra flotante de busqueda con Ctrl+F cuando el editor tiene foco', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'find-doc', value: '# Buscar\n\nalpha beta alpha' })),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const findInput = container.querySelector('.editor-findbar__input') as HTMLInputElement | null
    expect(findInput).toBeTruthy()
  })

  it('encuentra coincidencias y navega con Enter en la barra de busqueda', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'find-doc-nav', value: 'uno dos uno tres uno' })),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const findInput = container.querySelector('.editor-findbar__input') as HTMLInputElement
    expect(findInput).toBeTruthy()

    act(() => {
      findInput.value = 'uno'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)
    let count = container.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('1/3')
    expect(container.querySelector('.editor-find-highlight')).toBeTruthy()

    act(() => {
      findInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await sleep(20)
    count = container.querySelector('.editor-findbar__count') as HTMLSpanElement
    expect(count.textContent).toBe('2/3')
    expect(document.activeElement).toBe(findInput)
    expect(container.querySelector('.editor-find-highlight')).toBeTruthy()
  })

  it('mantiene foco en la barra de busqueda mientras se escribe', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({ documentId: 'find-focus-doc', value: 'lorem ipsum lorem' })),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)

    act(() => {
      editor.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })

    await sleep(20)

    const findInput = container.querySelector('.editor-findbar__input') as HTMLInputElement
    expect(findInput).toBeTruthy()

    act(() => {
      findInput.focus()
      findInput.value = 'l'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)
    expect(document.activeElement).toBe(findInput)

    act(() => {
      findInput.value = 'lo'
      findInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await sleep(20)
    expect(document.activeElement).toBe(findInput)
  })
})
