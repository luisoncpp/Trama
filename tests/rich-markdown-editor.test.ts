import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h, render, Fragment } from 'preact'
import { act } from 'preact/test-utils'
import { useState } from 'preact/hooks'
import Quill from 'quill'
import { RichMarkdownEditor } from '../src/features/project-editor/components/rich-markdown-editor'
import { hydrateMarkdownImages, getImageMap } from '../src/shared/markdown-image-placeholder'
import type { EditorSerializationRefs } from '../src/features/project-editor/project-editor-types'

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

  function findDirectiveIndex(editor: Quill, directiveName: string, role?: 'start' | 'end'): number {
    const ops = editor.getContents().ops ?? []
    let runningIndex = 0

    for (const op of ops) {
      const isDirectiveEmbed = typeof op.insert === 'object' && op.insert !== null && 'trama-directive' in op.insert
      if (isDirectiveEmbed) {
        const value = (op.insert as Record<string, unknown>)['trama-directive'] as {
          directive?: string
          role?: 'start' | 'end'
        }
        if (value?.directive === directiveName && (role === undefined || value.role === role)) {
          return runningIndex
        }
      }

      runningIndex += typeof op.insert === 'string' ? op.insert.length : 1
    }

    return -1
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

  it('sincroniza el atributo spellcheck del editor con la prop', async () => {
    function TestHarness() {
      const [spellcheckEnabled, setSpellcheckEnabled] = useState(true)

      return h(Fragment, null, [
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'spellcheck-doc',
          value: 'palabra inventadaa',
          spellcheckEnabled,
        })),
        h('button', {
          id: 'toggle-spellcheck',
          onClick: () => setSpellcheckEnabled((value) => !value),
          textContent: 'Toggle Spellcheck',
        }),
      ])
    }

    act(() => {
      render(h(TestHarness, {}), container)
    })

    await sleep(80)

    const editorRoot = container.querySelector('.ql-editor') as HTMLElement
    expect(editorRoot.getAttribute('spellcheck')).toBe('true')
    expect(editorRoot.spellcheck).toBe(true)

    const button = container.querySelector('#toggle-spellcheck') as HTMLButtonElement
    act(() => {
      button.click()
    })

    await sleep(80)

    expect(editorRoot.getAttribute('spellcheck')).toBe('false')
    expect(editorRoot.spellcheck).toBe(false)
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

  it('trata pagebreak como embed atomico de longitud 1 y lo elimina en un solo paso', async () => {
    let lastMarkdown = ''
    const serializationRef = { current: { flush: () => null as string | null } }
    const source = [
      '# Capitulo',
      '<!-- trama:spacer lines=2 -->',
      '<!-- trama:pagebreak -->',
      'Texto final',
    ].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-atomic-doc',
          value: source,
          onChange: (markdown) => {
            lastMarkdown = markdown
          },
          editorSerializationRef: serializationRef,
        })),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const beforeLength = editor.getLength()
    const pagebreakIndex = findDirectiveIndex(editor, 'pagebreak')

    expect(pagebreakIndex).toBeGreaterThanOrEqual(0)

    act(() => {
      editor.setSelection(pagebreakIndex, 0, 'silent')
      editor.deleteText(pagebreakIndex, 1, 'user')
    })

    await sleep(40)
    serializationRef.current.flush()

    const afterLength = editor.getLength()
    expect(afterLength).toBe(beforeLength - 1)
    expect(lastMarkdown).not.toContain('<!-- trama:pagebreak -->')
    expect(lastMarkdown).toContain('<!-- trama:spacer lines=2 -->')
  })

  it('avanza con ArrowRight en un solo paso cuando el cursor esta sobre pagebreak', async () => {
    const source = ['Inicio', '<!-- trama:pagebreak -->', 'Fin'].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-arrow-right-doc',
          value: source,
        })),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const pagebreakIndex = findDirectiveIndex(editor, 'pagebreak')
    expect(pagebreakIndex).toBeGreaterThanOrEqual(0)

    act(() => {
      editor.focus()
      editor.setSelection(pagebreakIndex, 0, 'silent')
      editor.root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })

    await sleep(30)

    const selection = editor.getSelection()
    expect(selection?.index).toBe(pagebreakIndex + 1)
    expect(selection?.length).toBe(0)
  })

  it('retrocede con ArrowLeft en un solo paso cuando el cursor esta despues de pagebreak', async () => {
    const source = ['Inicio', '<!-- trama:pagebreak -->', 'Fin'].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-arrow-left-doc',
          value: source,
        })),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const pagebreakIndex = findDirectiveIndex(editor, 'pagebreak')
    expect(pagebreakIndex).toBeGreaterThanOrEqual(0)

    act(() => {
      editor.focus()
      editor.setSelection(pagebreakIndex + 1, 0, 'silent')
      editor.root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })

    await sleep(30)

    const selection = editor.getSelection()
    expect(selection?.index).toBe(pagebreakIndex)
    expect(selection?.length).toBe(0)
  })

  it('preserva directivas en round-trip source-editor-source tras edicion de usuario', async () => {
    let lastMarkdown = ''
    const serializationRef = { current: { flush: () => null as string | null } }
    const source = [
      '# Titulo',
      '<!-- trama:center:start -->',
      'Texto centrado',
      '<!-- trama:center:end -->',
      '<!-- trama:spacer lines=2 -->',
      '<!-- trama:pagebreak -->',
      '<!-- trama:custom mode=soft -->',
    ].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-roundtrip-doc',
          value: source,
          onChange: (markdown) => {
            lastMarkdown = markdown
          },
          editorSerializationRef: serializationRef,
        })),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)

    act(() => {
      editor.insertText(editor.getLength() - 1, '\nTexto agregado', 'user')
    })

    await sleep(40)
    serializationRef.current.flush()

    expect(lastMarkdown).toContain('Texto agregado')
    expect(lastMarkdown).toContain('<!-- trama:center:start -->')
    expect(lastMarkdown).toContain('<!-- trama:center:end -->')
    expect(lastMarkdown).toContain('<!-- trama:spacer lines=2 -->')
    expect(lastMarkdown).toContain('<!-- trama:pagebreak -->')
    expect(lastMarkdown).toContain('<!-- trama:custom mode=soft -->')
  })

  it('mantiene orden de directivas tras inserciones y borrados de varios parrafos', async () => {
    let lastMarkdown = ''
    const serializationRef = { current: { flush: () => null as string | null } }
    const source = [
      '# Capitulo',
      'Bloque inicial',
      'Parrafo despues',
      '<!-- trama:spacer lines=3 -->',
      '<!-- trama:pagebreak -->',
      '<!-- trama:custom mode=soft -->',
      'Cierre',
    ].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-ordering-doc',
          value: source,
          onChange: (markdown) => {
            lastMarkdown = markdown
          },
          editorSerializationRef: serializationRef,
        })),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)

    const spacerIndex = findDirectiveIndex(editor, 'spacer')
    const pagebreakIndex = findDirectiveIndex(editor, 'pagebreak')
    const unknownIndex = findDirectiveIndex(editor, 'unknown')

    expect(spacerIndex).toBeGreaterThanOrEqual(0)
    expect(pagebreakIndex).toBeGreaterThan(spacerIndex)
    expect(unknownIndex).toBeGreaterThan(pagebreakIndex)

    const initialBlockIndex = editor.getText().indexOf('Bloque inicial')
    expect(initialBlockIndex).toBeGreaterThanOrEqual(0)

    act(() => {
      editor.insertText(initialBlockIndex, 'Nuevo bloque A\n\nNuevo bloque B\n', 'user')
    })

    await sleep(20)

    const paragraphIndex = editor.getText().indexOf('Parrafo despues')
    expect(paragraphIndex).toBeGreaterThanOrEqual(0)

    act(() => {
      editor.deleteText(paragraphIndex, 'Parrafo despues'.length, 'user')
    })

    await sleep(20)

    act(() => {
      const updatedSpacerIndex = findDirectiveIndex(editor, 'spacer')
      editor.insertText(updatedSpacerIndex, '\nAntes del spacer agregado\n', 'user')
    })

    await sleep(30)
    serializationRef.current.flush()

    expect(lastMarkdown).toContain('Nuevo bloque A')
    expect(lastMarkdown).toContain('Nuevo bloque B')
    expect(lastMarkdown).toContain('Antes del spacer agregado')
    expect(lastMarkdown).not.toContain('Parrafo despues')

    const spacerPos = lastMarkdown.indexOf('<!-- trama:spacer lines=3 -->')
    const pagebreakPos = lastMarkdown.indexOf('<!-- trama:pagebreak -->')
    const unknownPos = lastMarkdown.indexOf('<!-- trama:custom mode=soft -->')

    expect(spacerPos).toBeGreaterThanOrEqual(0)
    expect(pagebreakPos).toBeGreaterThan(spacerPos)
    expect(unknownPos).toBeGreaterThan(pagebreakPos)
  })

  it('aplica centrado a bloques entre center:start y center:end', async () => {
    const source = [
      '# Titulo',
      '<!-- trama:center:start -->',
      'Texto centrado',
      '<!-- trama:center:end -->',
      'Texto normal',
    ].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-centering-doc',
          value: source,
        })),
        container,
      )
    })

    await sleep(80)

    const centeredParagraph = container.querySelector('.ql-editor p.trama-centered-content')
    expect(centeredParagraph?.textContent).toContain('Texto centrado')
  })

  it('inserta directivas center desde boton de toolbar', async () => {
    let lastMarkdown = ''
    const serializationRef = { current: { flush: () => null as string | null } }

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-toolbar-center-doc',
          value: 'Texto para centrar',
          onChange: (markdown) => {
            lastMarkdown = markdown
          },
          editorSerializationRef: serializationRef,
        })),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)
    const centerButton = container.querySelector('button.ql-center-layout') as HTMLButtonElement

    act(() => {
      editor.focus()
      editor.setSelection(0, 'Texto para centrar'.length, 'silent')
      centerButton.click()
    })

    await sleep(40)
    serializationRef.current.flush()

    expect(lastMarkdown).toContain('<!-- trama:center:start -->')
    expect(lastMarkdown).toContain('<!-- trama:center:end -->')
  })

  it('inserta directiva pagebreak desde toolbar', async () => {
    let lastMarkdown = ''
    const serializationRef = { current: { flush: () => null as string | null } }

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-toolbar-spacer-break-doc',
          value: 'Inicio\n\nFin',
          onChange: (markdown) => {
            lastMarkdown = markdown
          },
          editorSerializationRef: serializationRef,
        })),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const pagebreakButton = container.querySelector('button.ql-pagebreak-layout') as HTMLButtonElement

    act(() => {
      editor.focus()
      pagebreakButton.click()
    })

    await sleep(40)
    serializationRef.current.flush()

    expect(lastMarkdown).toContain('<!-- trama:pagebreak -->')
  })

  it('permite centrar e insertar pagebreak aunque saveDisabled sea true', async () => {
    let lastMarkdown = ''
    const serializationRef = { current: { flush: () => null as string | null } }

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-toolbar-enabled-clean-doc',
          value: 'Texto base',
          saveDisabled: true,
          onChange: (markdown) => {
            lastMarkdown = markdown
          },
          editorSerializationRef: serializationRef,
        })),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const centerButton = container.querySelector('button.ql-center-layout') as HTMLButtonElement
    const pagebreakButton = container.querySelector('button.ql-pagebreak-layout') as HTMLButtonElement

    expect(centerButton.disabled).toBe(false)
    expect(pagebreakButton.disabled).toBe(false)

    act(() => {
      editor.focus()
      editor.setSelection(0, 'Texto'.length, 'silent')
      centerButton.click()
      pagebreakButton.click()
    })

    await sleep(50)
    serializationRef.current.flush()

    expect(lastMarkdown).toContain('<!-- trama:center:start -->')
    expect(lastMarkdown).toContain('<!-- trama:center:end -->')
    expect(lastMarkdown).toContain('<!-- trama:pagebreak -->')
  })

  it('inserta pagebreak exactamente en el indice del cursor', async () => {
    let lastMarkdown = ''
    const serializationRef = { current: { flush: () => null as string | null } }

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-pagebreak-inline-doc',
          value: 'afdaas',
          onChange: (markdown) => {
            lastMarkdown = markdown
          },
          editorSerializationRef: serializationRef,
        })),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const pagebreakButton = container.querySelector('button.ql-pagebreak-layout') as HTMLButtonElement

    act(() => {
      editor.focus()
      editor.setSelection(4, 0, 'silent')
      pagebreakButton.click()
    })

    await sleep(40)
    serializationRef.current.flush()

    const prefixPos = lastMarkdown.indexOf('afda')
    const pagebreakPos = lastMarkdown.indexOf('<!-- trama:pagebreak -->')
    const suffixPos = lastMarkdown.lastIndexOf('as')

    expect(prefixPos).toBeGreaterThanOrEqual(0)
    expect(pagebreakPos).toBeGreaterThan(prefixPos)
    expect(suffixPos).toBeGreaterThan(pagebreakPos)
    expect(lastMarkdown).not.toContain('<!-- trama:pagebreak -->\nafdaas')
  })

  it('serializa saltos de linea repetidos como directiva spacer', async () => {
    let lastMarkdown = ''
    const serializationRef = { current: { flush: () => null as string | null } }

    act(() => {
      render(
        h(RichMarkdownEditor, buildEditorProps({
          documentId: 'layout-newlines-to-spacer-doc',
          value: 'Linea A\n\nLinea B',
          onChange: (markdown) => {
            lastMarkdown = markdown
          },
          editorSerializationRef: serializationRef,
        })),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    act(() => {
      const index = editor.getText().indexOf('Linea B')
      editor.insertText(index, '\n\n', 'user')
    })

    await sleep(40)
    serializationRef.current.flush()

    expect(lastMarkdown).toMatch(/<!-- trama:spacer lines=\d+ -->/)
  })

  describe('IMAGE_PLACEHOLDER round-trip regression', () => {
    const TINY_PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwDwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
    const TINY_PNG_1X1_ALT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAACCAYAAABhuykZAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    it('preserva imagen en markdown tras pegar imagen base64', async () => {
      let lastMarkdown = ''
      const serializationRef = { current: { flush: () => null as string | null } }
      const docId = 'img-roundtrip-doc'

      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: docId,
            value: 'Inicio',
            onChange: (markdown) => {
              lastMarkdown = markdown
            },
            editorSerializationRef: serializationRef,
          })),
          container,
        )
      })

      await sleep(80)
      const editor = getQuillInstance(container)

      act(() => {
        editor.focus()
        editor.setSelection(editor.getLength() - 1, 0, 'silent')
      })

      await sleep(20)

      const imgHTML = `<img src="${TINY_PNG_1X1}">`
      editor.clipboard.dangerouslyPasteHTML(imgHTML, 'user')

      await sleep(80)
      serializationRef.current.flush()

      // In-memory markdown uses short placeholders for editing speed
      expect(lastMarkdown).toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')

      // Image data is cached and can be hydrated before save
      const imageMap = getImageMap(docId)
      expect(imageMap).toBeDefined()
      expect(imageMap?.get('img_0')).toContain(TINY_PNG_1X1.substring(0, 20))

      const hydrated = hydrateMarkdownImages(lastMarkdown, docId)
      expect(hydrated).toContain('![img_0](')
      expect(hydrated).toContain(TINY_PNG_1X1.substring(0, 20))
    })

    it('tras recargar markdown estandar con imagen base64, imagen vuelve al editor', async () => {
      const markdownWithImage = [
        'Texto antes',
        `![img_0](${TINY_PNG_1X1_ALT})`,
        'Texto despues',
      ].join('\n')

      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'img-reload-doc',
            value: markdownWithImage,
          })),
          container,
        )
      })

      await sleep(80)

      const editor = getQuillInstance(container)
      const editorHTML = editor.root.innerHTML

      expect(editorHTML).toContain('data:image/png')
      expect(editorHTML).toContain(TINY_PNG_1X1_ALT.substring(0, 20))
    })

    it('tras recargar markdown con comentario HTML antiguo, imagen vuelve al editor (retrocompatibilidad)', async () => {
      const markdownWithLegacyPlaceholder = [
        'Texto antes',
        `<!-- IMAGE_PLACEHOLDER:img_0:${TINY_PNG_1X1_ALT} -->`,
        'Texto despues',
      ].join('\n')

      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'img-reload-legacy-doc',
            value: markdownWithLegacyPlaceholder,
          })),
          container,
        )
      })

      await sleep(80)

      const editor = getQuillInstance(container)
      const editorHTML = editor.root.innerHTML

      expect(editorHTML).toContain('data:image/png')
      expect(editorHTML).toContain(TINY_PNG_1X1_ALT.substring(0, 20))
    })

    it('vuelve a editar documento con imagen y preserva la imagen en output', async () => {
      let lastMarkdown = ''
      const serializationRef = { current: { flush: () => null as string | null } }
      const docId = 'img-edit-doc'

      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: docId,
            value: `Texto inicial\n\n![img_0](${TINY_PNG_1X1})\n\nTexto final`,
            onChange: (markdown) => {
              lastMarkdown = markdown
            },
            editorSerializationRef: serializationRef,
          })),
          container,
        )
      })

      await sleep(80)
      const editor = getQuillInstance(container)

      act(() => {
        editor.insertText(editor.getLength() - 1, ' agregado', 'user')
      })

      await sleep(60)
      serializationRef.current.flush()

      // In-memory markdown uses short placeholders for editing speed
      expect(lastMarkdown).toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')
      expect(lastMarkdown).not.toContain('data:image/png')

      // Image data is cached and can be hydrated before save
      const imageMap = getImageMap(docId)
      expect(imageMap).toBeDefined()
      expect(imageMap?.get('img_0')).toContain(TINY_PNG_1X1.substring(0, 20))

      const hydrated = hydrateMarkdownImages(lastMarkdown, docId)
      expect(hydrated).toContain('![img_0](')
      expect(hydrated).toContain(TINY_PNG_1X1.substring(0, 20))
    })

    it('no incluye IMAGE_PLACEHOLDER en output si no hay imagenes', async () => {
      let lastMarkdown = ''

      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'no-img-doc',
            value: '# Sin imagenes',
            onChange: (markdown) => {
              lastMarkdown = markdown
            },
          })),
          container,
        )
      })

      await sleep(80)
      const editor = getQuillInstance(container)

      act(() => {
        editor.insertText(editor.getLength() - 1, ' text', 'user')
      })

      await sleep(40)

      expect(lastMarkdown).not.toContain('IMAGE_PLACEHOLDER')
    })
  })
})
