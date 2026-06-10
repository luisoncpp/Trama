import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h, render, Fragment } from 'preact'
import { act } from 'preact/test-utils'
import Quill from 'quill'
import { RichMarkdownEditor } from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor'
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

describe('Copy as Markdown workspace command', () => {
  let container: HTMLDivElement
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const noop = () => {}

  function getQuillInstance(root: ParentNode): Quill {
    const quillContainer = root.querySelector('.ql-container')
    if (!quillContainer) throw new Error('No se encontro instancia de Quill en el DOM de prueba')
    const found = Quill.find(quillContainer, true)
    if (!found || !(found instanceof Quill)) throw new Error('No se encontro instancia de Quill en el DOM de prueba')
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

  function findTextIndex(editor: Quill, needle: string): number {
    const ops = editor.getContents().ops ?? []
    let runningIndex = 0

    for (const op of ops) {
      if (typeof op.insert === 'string') {
        const localIndex = op.insert.indexOf(needle)
        if (localIndex >= 0) {
          return runningIndex + localIndex
        }
        runningIndex += op.insert.length
        continue
      }

      runningIndex += 1
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

  it('copia el contenido como markdown cuando el editor tiene foco', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'copy-md-doc',
          value: '# Titulo\n\n**negrita**',
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
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)

    let writtenText = ''
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { writeText: async (text: string) => { writtenText = text } }

    act(() => { editor.focus() })
    await sleep(10)

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'copy-as-markdown' } }))
    })

    await sleep(60)

    try {
      if ((navigator as any)._origClipboard) {
        ;(navigator as any).clipboard = (navigator as any)._origClipboard
      }
    } catch { /* ignore */ }

    expect(writtenText).toContain('Titulo')
    expect(writtenText).toContain('negrita')
  })

  it('no copia si el editor no tiene foco', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'copy-md-doc-2',
          value: '# Sin Foco',
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
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)

    let writtenText = ''
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { writeText: async (text: string) => { writtenText = text } }

    act(() => { editor.blur() })

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'copy-as-markdown' } }))
    })

    await sleep(60)

    try {
      if ((navigator as any)._origClipboard) {
        ;(navigator as any).clipboard = (navigator as any)._origClipboard
      }
    } catch { /* ignore */ }

    expect(writtenText).toBe('')
  })

  it('preserva directivas de layout al copiar como markdown', async () => {
    const source = [
      '# Capitulo',
      '<!-- trama:center:start -->',
      'Texto centrado',
      '<!-- trama:center:end -->',
      '<!-- trama:spacer lines=2 -->',
      '<!-- trama:pagebreak -->',
      '<!-- trama:custom mode=soft -->',
    ].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'copy-md-directives',
          value: source,
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
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)

    let writtenText = ''
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { writeText: async (text: string) => { writtenText = text } }

    act(() => { editor.focus() })
    await sleep(10)

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'copy-as-markdown' } }))
    })

    await sleep(60)

    try {
      if ((navigator as any)._origClipboard) {
        ;(navigator as any).clipboard = (navigator as any)._origClipboard
      }
    } catch { /* ignore */ }

    expect(writtenText).toContain('<!-- trama:center:start -->')
    expect(writtenText).toContain('<!-- trama:center:end -->')
    expect(writtenText).toContain('<!-- trama:spacer lines=2 -->')
    expect(writtenText).toContain('<!-- trama:pagebreak -->')
    expect(writtenText).toContain('<!-- trama:custom mode=soft -->')
  })

  it('copia center toggleado como split canonico', async () => {
    const source = [
      '<!-- trama:center:start -->',
      'A',
      '',
      'B',
      '',
      'C',
      '',
      '<!-- trama:center:end -->',
      'D',
    ].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'copy-md-center-toggle-split',
          value: source,
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
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const centerButton = container.querySelector('button.ql-center-layout') as HTMLButtonElement
    const bIndexInDocument = findTextIndex(editor, 'B')
    expect(bIndexInDocument).toBeGreaterThanOrEqual(0)

    act(() => {
      editor.focus()
      editor.setSelection(bIndexInDocument, 0, 'silent')
      centerButton.click()
    })

    await sleep(40)

    let writtenText = ''
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { writeText: async (text: string) => { writtenText = text } }

    act(() => {
      editor.focus()
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'copy-as-markdown' } }))
    })

    await sleep(60)

    try {
      if ((navigator as any)._origClipboard) {
        ;(navigator as any).clipboard = (navigator as any)._origClipboard
      }
    } catch { /* ignore */ }

    const centerStarts = writtenText.match(/<!-- trama:center:start -->/g) ?? []
    const centerEnds = writtenText.match(/<!-- trama:center:end -->/g) ?? []
    expect(centerStarts).toHaveLength(2)
    expect(centerEnds).toHaveLength(2)

    const firstStartIndex = writtenText.indexOf('<!-- trama:center:start -->')
    const firstEndIndex = writtenText.indexOf('<!-- trama:center:end -->')
    const secondStartIndex = writtenText.indexOf('<!-- trama:center:start -->', firstStartIndex + 1)
    const secondEndIndex = writtenText.indexOf('<!-- trama:center:end -->', firstEndIndex + 1)
    const aIndex = writtenText.indexOf('A')
    const bIndex = writtenText.indexOf('B')
    const cIndex = writtenText.indexOf('C')
    const dIndex = writtenText.indexOf('D')

    expect(firstStartIndex).toBeLessThan(aIndex)
    expect(aIndex).toBeLessThan(firstEndIndex)
    expect(firstEndIndex).toBeLessThan(bIndex)
    expect(bIndex).toBeLessThan(secondStartIndex)
    expect(secondStartIndex).toBeLessThan(cIndex)
    expect(cIndex).toBeLessThan(secondEndIndex)
    expect(secondEndIndex).toBeLessThan(dIndex)
  })

  it('copia solo la seleccion cuando existe', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'copy-md-selection',
          value: 'alpha beta gamma',
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
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)

    let writtenText = ''
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { writeText: async (text: string) => { writtenText = text } }

    act(() => {
      editor.focus()
      editor.setSelection(6, 4, 'silent')
    })

    await sleep(10)

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'copy-as-markdown' } }))
    })

    await sleep(60)

    try {
      if ((navigator as any)._origClipboard) {
        ;(navigator as any).clipboard = (navigator as any)._origClipboard
      }
    } catch { /* ignore */ }

    expect(writtenText.trim()).toBe('beta')
  })

  it('preserva directiva incluida cuando la seleccion cruza un pagebreak', async () => {
    const source = [
      'Antes del salto',
      '<!-- trama:pagebreak -->',
      'Despues del salto',
    ].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'copy-md-selection-directive',
          value: source,
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
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const ops = editor.getContents().ops ?? []
    let runningIndex = 0
    let pagebreakIndex = -1

    for (const op of ops) {
      const isDirectiveEmbed = typeof op.insert === 'object' && op.insert !== null && 'trama-directive' in op.insert
      if (isDirectiveEmbed) {
        const value = (op.insert as Record<string, unknown>)['trama-directive'] as { directive?: string }
        if (value?.directive === 'pagebreak') {
          pagebreakIndex = runningIndex
          break
        }
      }

      runningIndex += typeof op.insert === 'string' ? op.insert.length : 1
    }

    expect(pagebreakIndex).toBeGreaterThanOrEqual(0)

    let writtenText = ''
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { writeText: async (text: string) => { writtenText = text } }

    act(() => {
      editor.focus()
      editor.setSelection(pagebreakIndex - 1, 3, 'silent')
    })

    await sleep(10)

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'copy-as-markdown' } }))
    })

    await sleep(60)

    try {
      if ((navigator as any)._origClipboard) {
        ;(navigator as any).clipboard = (navigator as any)._origClipboard
      }
    } catch { /* ignore */ }

    expect(writtenText).toContain('<!-- trama:pagebreak -->')
  })

  it('copia center:end desplazado tras delete en la costura', async () => {
    const source = [
      '<!-- trama:center:start -->',
      'A',
      '',
      '<!-- trama:center:end -->',
      'B',
      '',
      'C',
    ].join('\n')

    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'copy-md-center-delete-seam',
          value: source,
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
        }),
        container,
      )
    })

    await sleep(80)

    const editor = getQuillInstance(container)
    const endBoundaryIndex = findDirectiveIndex(editor, 'center', 'end')
    expect(endBoundaryIndex).toBeGreaterThanOrEqual(0)

    act(() => {
      editor.focus()
      editor.setSelection(endBoundaryIndex, 0, 'silent')
      editor.root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    })

    await sleep(40)

    let writtenText = ''
    ;(navigator as any)._origClipboard = (navigator as any).clipboard
    ;(navigator as any).clipboard = { writeText: async (text: string) => { writtenText = text } }

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: { type: 'copy-as-markdown' } }))
    })

    await sleep(60)

    try {
      if ((navigator as any)._origClipboard) {
        ;(navigator as any).clipboard = (navigator as any)._origClipboard
      }
    } catch { /* ignore */ }

    const centerStarts = writtenText.match(/<!-- trama:center:start -->/g) ?? []
    const centerEnds = writtenText.match(/<!-- trama:center:end -->/g) ?? []
    expect(centerStarts).toHaveLength(1)
    expect(centerEnds).toHaveLength(1)

    const startIndex = writtenText.indexOf('<!-- trama:center:start -->')
    const endIndex = writtenText.indexOf('<!-- trama:center:end -->')
    const aIndex = writtenText.indexOf('A')
    const bIndex = writtenText.indexOf('B')
    const cIndex = writtenText.indexOf('C')

    expect(startIndex).toBeLessThan(aIndex)
    expect(aIndex).toBeLessThan(bIndex)
    expect(bIndex).toBeLessThan(endIndex)
    expect(endIndex).toBeLessThan(cIndex)
  })

})

describe('Quill Clipboard Matchers for layout directives', () => {
  let container: HTMLDivElement
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const noop = () => {}

  function getQuillInstance(root: ParentNode): Quill {
    const quillContainer = root.querySelector('.ql-container')
    if (!quillContainer) throw new Error('No se encontro instancia de Quill en el DOM de prueba')
    const found = Quill.find(quillContainer, true)
    if (!found || !(found instanceof Quill)) throw new Error('No se encontro instancia de Quill en el DOM de prueba')
    return found
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('preserva contenido normal dentro de divs al pegar HTML', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'paste-normal-div',
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
        }),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)

    const htmlToPaste = '<div>Texto normal <strong>en negrita</strong> en un div</div>'
    act(() => {
      const delta = editor.clipboard.convert({ html: htmlToPaste })
      editor.setContents(delta, 'user')
    })

    const text = editor.getText().trim()
    expect(text).toBe('Texto normal en negrita en un div')
  })

  it('reconoce directivas de layout como trama-pagebreak al pegar HTML', async () => {
    act(() => {
      render(
        h(RichMarkdownEditor, {
          documentId: 'paste-directive-div',
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
        }),
        container,
      )
    })

    await sleep(80)
    const editor = getQuillInstance(container)

    const htmlToPaste = '<div class="trama-pagebreak"></div>'
    act(() => {
      const delta = editor.clipboard.convert({ html: htmlToPaste })
      editor.setContents(delta, 'user')
    })

    const ops = editor.getContents().ops ?? []
    const hasPagebreak = ops.some(op => 
      typeof op.insert === 'object' && 
      op.insert !== null && 
      'trama-directive' in op.insert &&
      (op.insert as any)['trama-directive']?.directive === 'pagebreak'
    )
    expect(hasPagebreak).toBe(true)
  })
})

