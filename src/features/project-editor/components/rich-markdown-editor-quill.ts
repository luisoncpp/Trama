import Quill from 'quill'
import TurndownService from 'turndown'
import { marked } from 'marked'
import { renderDirectiveArtifactsToMarkdown } from '../../../shared/markdown-layout-directives'
import { normalizeBlankLinesToSpacerDirectives } from '../../../shared/markdown-layout-directives-spacing'
import { registerLayoutDirectiveBlots } from './rich-markdown-editor-layout-blots'
import { registerLayoutDirectiveClipboardMatchers } from './rich-markdown-editor-layout-clipboard'
import { registerLayoutDirectiveKeyboardBindings } from './rich-markdown-editor-layout-keyboard'
import { syncCenteredLayoutArtifacts } from './rich-markdown-editor-layout-centering'

type QuillChangeSource = 'api' | 'user' | 'silent'

export function normalizeMarkdown(input: string): string {
  return input.replace(/\r\n/g, '\n').trimEnd()
}

export function createQuillEditor(host: HTMLDivElement): Quill {
  registerLayoutDirectiveBlots()
  host.innerHTML = ''
  const toolbar = document.createElement('div')
  const editorHost = document.createElement('div')
  host.append(toolbar, editorHost)
  const editor = new Quill(editorHost, {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
      ],
      history: {
        userOnly: true,
      },
    },
  })
  registerLayoutDirectiveClipboardMatchers(editor)
  registerLayoutDirectiveKeyboardBindings(editor)
  return editor
}

export function syncEditorSpellcheck(editor: Quill, spellcheckEnabled: boolean): void {
  editor.root.spellcheck = spellcheckEnabled
  editor.root.setAttribute('spellcheck', spellcheckEnabled ? 'true' : 'false')
}

export function applyMarkdownToEditor(editor: Quill, markdown: string, source: QuillChangeSource = 'api'): void {
  const { markdownWithArtifacts } = renderDirectiveArtifactsToMarkdown(markdown)
  editor.setContents([], source)
  editor.clipboard.dangerouslyPasteHTML(marked.parse(markdownWithArtifacts) as string, source)
  syncCenteredLayoutArtifacts(editor)
}

export function serializeEditorMarkdown(turndownService: TurndownService, html: string): string {
  const markdown = normalizeMarkdown(turndownService.turndown(html))
  return normalizeBlankLinesToSpacerDirectives(markdown)
}

export function serializeEditorMarkdownFromRef(turndownRef: { current: TurndownService }, html: string): string {
  return serializeEditorMarkdown(turndownRef.current, html)
}