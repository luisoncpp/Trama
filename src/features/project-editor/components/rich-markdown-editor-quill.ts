import Quill from 'quill'
import TurndownService from 'turndown'
import { marked } from 'marked'
import { renderDirectiveArtifactsToMarkdown } from '../../../shared/markdown-layout-directives'
import { normalizeBlankLinesToSpacerDirectives } from '../../../shared/markdown-layout-directives-spacing'
import { registerLayoutDirectiveBlots } from './rich-markdown-editor-layout-blots'
import { registerLayoutDirectiveClipboardMatchers } from './rich-markdown-editor-layout-clipboard'
import { registerLayoutDirectiveKeyboardBindings } from './rich-markdown-editor-layout-keyboard'
import { syncCenteredLayoutArtifacts } from './rich-markdown-editor-layout-centering'
import { serializeDirectiveArtifactNode } from '../../../shared/markdown-layout-directives'
import type { DirectiveArtifactNode } from '../../../shared/markdown-layout-directives-artifact-node'
import {
  stripBase64ImagesFromHtml,
} from '../../../shared/markdown-image-placeholder'

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

export function restoreImagesAfterMarkedparsing(html: string, _imageMap: Map<string, string>): string {
  const regex = /<!--\s*IMAGE_PLACEHOLDER:([^:]+):(data:image\/[^>]+)\s*-->/gi
  return html.replace(regex, (_match, _uuid, dataUrl) => {
    return `<img src="${dataUrl}">`
  })
}

export function applyMarkdownToEditor(
  editor: Quill,
  markdown: string,
  source: QuillChangeSource = 'api',
): void {
  const { markdownWithArtifacts } = renderDirectiveArtifactsToMarkdown(markdown)
  const parsed = marked.parse(markdownWithArtifacts) as string
  const withImages = restoreImagesAfterMarkedparsing(parsed, new Map())
  editor.setContents([], source)
  editor.clipboard.dangerouslyPasteHTML(withImages, source)
  syncCenteredLayoutArtifacts(editor)
}

export function serializeEditorMarkdown(
  _turndownService: TurndownService,
  html: string,
  documentId: string,
): string {
  const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html, documentId)

  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })

  td.addRule('trama-layout-directives', {
    filter: (node) => Boolean((node as { getAttribute?: (name: string) => string | null }).getAttribute?.('data-trama-directive')),
      replacement: (_content, node) => {
        const directiveComment = serializeDirectiveArtifactNode(node as DirectiveArtifactNode)
        return directiveComment ? `\n${directiveComment}\n` : ''
      },
  })

  if (imageMap.size > 0) {
    td.addRule('tramaImagePlaceholder', {
      filter: (node) => {
        if (node.nodeName !== 'IMG') return false
        const src = (node as { getAttribute?: (name: string) => string | null }).getAttribute?.('src') ?? ''
        return src.startsWith('trama-image-placeholder:')
      },
      replacement: (_content, node) => {
        const src = (node as { getAttribute?: (name: string) => string | null }).getAttribute?.('src') ?? ''
        const uuid = src.slice('trama-image-placeholder:'.length)
        return `<!-- IMAGE_PLACEHOLDER:${uuid} -->`
      },
    })
  }

  const markdown = normalizeMarkdown(td.turndown(htmlWithoutImages))
  return normalizeBlankLinesToSpacerDirectives(markdown)
}

export function serializeEditorMarkdownFromRef(
  turndownRef: { current: TurndownService },
  html: string,
  documentId: string,
): string {
  return serializeEditorMarkdown(turndownRef.current, html, documentId)
}
