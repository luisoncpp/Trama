import { describe, expect, it, vi } from 'vitest'
import { createTramaTurndownService, normalizeMarkdownOutput, TurndownServiceFlags } from '../src/shared/turndown-service-factory'
import { EditorSessionImpl } from '../src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-lifecycle'

describe('blank line spacer bug', () => {
  it('turndown: single empty paragraph between two paragraphs', () => {
    const td = createTramaTurndownService(TurndownServiceFlags.None)
    const html = '<p>Paragraph 1</p><p><br></p><p>Paragraph 2</p>'
    const raw = td.turndown(html)
    const normalized = normalizeMarkdownOutput(raw)
    expect(normalized).not.toContain('<!-- trama:spacer lines=2 -->')
    expect(normalized).toContain('<!-- trama:spacer lines=1 -->')
  })

  it('turndown: two empty paragraphs between two paragraphs become spacer lines=2', () => {
    const td = createTramaTurndownService(TurndownServiceFlags.None)
    const html = '<p>Paragraph 1</p><p><br></p><p><br></p><p>Paragraph 2</p>'
    const raw = td.turndown(html)
    const normalized = normalizeMarkdownOutput(raw)
    expect(normalized).toContain('<!-- trama:spacer lines=2 -->')
    expect(normalized).not.toContain('<!-- trama:spacer lines=3 -->')
  })

  it('editor flush: one blank line between paragraphs should not become spacer lines=2', () => {
    const host = document.createElement('div')
    const onChange = vi.fn()
    const session = new EditorSessionImpl({
      host,
      documentId: 'blank-line-bug-doc',
      value: 'Paragraph 1\n\nParagraph 2',
      spellcheckEnabled: true,
      onChangeRef: { current: onChange },
      onDirtyRef: { current: () => {} },
    })

    const editor = session.getEditor()!
    const lineBIndex = editor.getText().indexOf('Paragraph 2')
    editor.insertText(lineBIndex, '\n', 'user')

    const flushed = session.flush() ?? ''
    expect(flushed).not.toContain('<!-- trama:spacer lines=2 -->')
    expect(flushed).toContain('<!-- trama:spacer lines=1 -->')

    session.dispose()
    host.remove()
  })

  it('editor reopen: a saved one-line spacer does not add another blank paragraph', () => {
    const host = document.createElement('div')
    const session = new EditorSessionImpl({
      host,
      documentId: 'blank-line-reopen-doc',
      value: 'Paragraph 1\n\n<!-- trama:spacer lines=1 -->\n\nParagraph 2',
      spellcheckEnabled: true,
      onChangeRef: { current: () => {} },
      onDirtyRef: { current: () => {} },
    })

    const editor = session.getEditor()!
    const contents = editor.getContents()
    const textOps = contents.ops.filter((op) => typeof op.insert === 'string')

    expect(textOps.map((op) => op.insert).join('')).toBe('Paragraph 1\nParagraph 2\n')
    expect(editor.root.innerHTML).not.toContain('<p><br></p>')
    expect(session.flush()).toBe('Paragraph 1\n\n<!-- trama:spacer lines=1 -->\n\nParagraph 2')

    session.dispose()
    host.remove()
  })
})
