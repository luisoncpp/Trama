import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EditorSessionImpl } from '../src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-lifecycle'

describe('EditorSession', () => {
  let host: HTMLDivElement

  beforeEach(() => {
    host = document.createElement('div')
  })

  afterEach(() => {
    host.remove()
  })

  function createSession(
    documentId: string,
    value = '',
    onChange = vi.fn(),
    onDirty = vi.fn(),
  ): EditorSessionImpl {
    return new EditorSessionImpl({
      host,
      documentId,
      value,
      spellcheckEnabled: true,
      onChangeRef: { current: onChange },
      onDirtyRef: { current: onDirty },
    })
  }

  it('init -> text-change -> debounce flush updates canonical value', async () => {
    const onChange = vi.fn()
    const session = createSession('debounce-doc', '', onChange)

    const editor = session.getEditor()!
    editor.insertText(0, 'hello world', 'user')

    expect(session.flush()).toContain('hello world')
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('hello world'))

    session.dispose()
  })

  it('flush return value is placeholder markdown compatible with caller contract', () => {
    const session = createSession('flush-doc', '# Title')

    const flushed = session.flush()
    expect(typeof flushed).toBe('string')
    expect(flushed).toContain('# Title')

    session.dispose()
  })

  it('external value apply with forceApplyVersion overrides canonical comparison', () => {
    const session = createSession('external-doc', 'initial')

    session.applyExternalValue('initial', 1)
    expect(session.getCanonicalValue()).toBe('initial')

    session.applyExternalValue('updated', 2)
    expect(session.getCanonicalValue()).toBe('updated')

    session.dispose()
  })

  it('documentId change cleanup cancels timer and does not flush', async () => {
    const onChange = vi.fn()
    const session = createSession('cleanup-doc', '', onChange)

    const editor = session.getEditor()!
    editor.insertText(0, 'pending', 'user')

    session.dispose()

    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('closure capture: handler for pane A does not read pane B editor at fire time', () => {
    const hostA = document.createElement('div')
    const hostB = document.createElement('div')

    const onChangeA = vi.fn()
    const onChangeB = vi.fn()

    const sessionA = new EditorSessionImpl({
      host: hostA,
      documentId: 'pane-a',
      value: '',
      spellcheckEnabled: true,
      onChangeRef: { current: onChangeA },
      onDirtyRef: { current: () => {} },
    })

    const sessionB = new EditorSessionImpl({
      host: hostB,
      documentId: 'pane-b',
      value: '',
      spellcheckEnabled: true,
      onChangeRef: { current: onChangeB },
      onDirtyRef: { current: () => {} },
    })

    sessionA.getEditor()!.insertText(0, 'only in a', 'user')

    const flushedA = sessionA.flush()
    const flushedB = sessionB.flush()

    expect(flushedA).toContain('only in a')
    expect(flushedB).not.toContain('only in a')
    expect(onChangeA).toHaveBeenCalledWith(expect.stringContaining('only in a'))
    expect(onChangeB).not.toHaveBeenCalledWith(expect.stringContaining('only in a'))

    sessionA.dispose()
    sessionB.dispose()
    hostA.remove()
    hostB.remove()
  })
})
