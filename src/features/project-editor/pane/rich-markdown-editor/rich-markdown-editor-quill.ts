import Quill from 'quill'
import TurndownService from 'turndown'
import { marked } from 'marked'
import { renderDirectiveArtifactsToMarkdown } from '../../../../shared/markdown-layout-directives'
import { registerLayoutDirectiveBlots } from './rich-markdown-editor-layout-blots'
import { registerLayoutDirectiveClipboardMatchers } from './rich-markdown-editor-layout-clipboard'
import { registerLayoutDirectiveKeyboardBindings } from './rich-markdown-editor-layout-keyboard'
import { syncCenteredLayoutArtifacts } from './rich-markdown-editor-layout-centering'
import {
  hydrateMarkdownImages,
  storeImageMap,
  stripBase64ImagesFromHtml,
} from '../../../../shared/markdown-image-placeholder'
import { createTramaTurndownService, normalizeMarkdownOutput, TurndownServiceFlags } from '../../../../shared/turndown-service-factory'

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
  documentId?: string,
): void {
  const root = editor.root as HTMLDivElement
  const previousEditable = root.contentEditable
  root.contentEditable = 'false'
  try {
    const hydratedMarkdown = documentId ? hydrateMarkdownImages(markdown, documentId) : markdown
    const { markdownWithArtifacts } = renderDirectiveArtifactsToMarkdown(hydratedMarkdown)
    const parsed = marked.parse(markdownWithArtifacts) as string
    const withImages = restoreImagesAfterMarkedparsing(parsed, new Map())
    editor.clipboard.dangerouslyPasteHTML(withImages, source)
    syncCenteredLayoutArtifacts(editor)
  } finally {
    root.contentEditable = previousEditable
  }
}

export function serializeEditorMarkdown(
  _turndownService: unknown,
  html: string,
  documentId: string,
): string {
  const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html)

  if (documentId && imageMap.size > 0) {
    storeImageMap(documentId, imageMap)
  }

  const serviceFlags = imageMap.size > 0 ? TurndownServiceFlags.HasImages : TurndownServiceFlags.None
  const service = createTramaTurndownService(serviceFlags)

  return normalizeMarkdownOutput(service.turndown(htmlWithoutImages))
}

export function serializeEditorMarkdownFromRef(
  turndownRef: { current: TurndownService },
  html: string,
  documentId: string,
): string {
  return serializeEditorMarkdown(turndownRef.current, html, documentId)
}
