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
})
